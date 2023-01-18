import { Component, linkEvent } from "inferno";
import { Link } from "inferno-router";
import {
  AddAdminResponse,
  BanPerson,
  BanPersonResponse,
  BlockPerson,
  BlockPersonResponse,
  CommentResponse,
  GetPersonDetails,
  GetPersonDetailsResponse,
  GetSiteResponse,
  PostResponse,
  PurgeItemResponse,
  SortType,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import moment from "moment";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { InitialFetchRequest, PersonDetailsView } from "../../interfaces";
import { createPayment } from "../../pisdk";
import { UserService, WebSocketService } from "../../services";
import {
  canMod,
  capitalizeFirstLetter,
  createCommentLikeRes,
  createPostLikeFindRes,
  editCommentRes,
  editPostFindRes,
  enableDownvotes,
  enableNsfw,
  eth001,
  fetchLimit,
  futureDaysToUnixTime,
  gasPrice,
  getUsernameFromProps,
  isAdmin,
  isBanned,
  //wsUserOp,
  isBrowser,
  mdToHtml,
  myAuth,
  numToSI,
  relTags,
  restoreScrollPosition,
  routeSortTypeToEnum,
  saveCommentRes,
  saveScrollPosition,
  setIsoData,
  setupTippy,
  toast,
  updatePersonBlock,
  utf8ToHex,
  web3AnchorAddress,
  wsClient,
  wsSubscribe,
} from "../../utils";
import { BannerIconHeader } from "../common/banner-icon-header";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { MomentTime } from "../common/moment-time";
import { SortSelect } from "../common/sort-select";
import { CommunityLink } from "../community/community-link";
import { PersonDetails } from "./person-details";
import { PersonListing } from "./person-listing";

interface ProfileState {
  personRes?: GetPersonDetailsResponse;
  userName: string;
  view: PersonDetailsView;
  sort: SortType;
  page: number;
  loading: boolean;
  personBlocked: boolean;
  banReason?: string;
  banExpireDays?: number;
  showBanDialog: boolean;
  removeData: boolean;
  siteRes: GetSiteResponse;
}

interface ProfileProps {
  view: PersonDetailsView;
  sort: SortType;
  page: number;
  person_id?: string;
  username: string;
}

interface UrlParams {
  view?: string;
  sort?: SortType;
  page?: number;
}

export class Profile extends Component<any, ProfileState> {
  private isoData = setIsoData(this.context);
  private subscription?: Subscription;
  state: ProfileState = {
    userName: getUsernameFromProps(this.props),
    loading: true,
    view: Profile.getViewFromProps(this.props.match.view),
    sort: Profile.getSortTypeFromProps(this.props.match.sort),
    page: Profile.getPageFromProps(this.props.match.page),
    personBlocked: false,
    siteRes: this.isoData.site_res,
    showBanDialog: false,
    removeData: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleSortChange = this.handleSortChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state = {
        ...this.state,
        personRes: this.isoData.routeData[0] as GetPersonDetailsResponse,
        loading: false,
      };
    } else {
      this.fetchUserData();
    }
  }

  fetchUserData() {
    let form: GetPersonDetails = {
      username: this.state.userName,
      sort: this.state.sort,
      saved_only: this.state.view === PersonDetailsView.Saved,
      page: this.state.page,
      limit: fetchLimit,
      auth: myAuth(false),
    };
    WebSocketService.Instance.send(wsClient.getPersonDetails(form));
  }

  get amCurrentUser() {
    return (
      UserService.Instance.myUserInfo?.local_user_view.person.id ==
      this.state.personRes?.person_view.person.id
    );
  }

  setPersonBlock() {
    let mui = UserService.Instance.myUserInfo;
    let res = this.state.personRes;
    if (mui && res) {
      this.setState({
        personBlocked: mui.person_blocks
          .map(a => a.target.id)
          .includes(res.person_view.person.id),
      });
    }
  }

  static getViewFromProps(view: string): PersonDetailsView {
    return view ? PersonDetailsView[view] : PersonDetailsView.Overview;
  }

  static getSortTypeFromProps(sort: string): SortType {
    return sort ? routeSortTypeToEnum(sort) : SortType.New;
  }

  static getPageFromProps(page: number): number {
    return page ? Number(page) : 1;
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let pathSplit = req.path.split("/");

    let username = pathSplit[2];
    let view = this.getViewFromProps(pathSplit[4]);
    let sort = this.getSortTypeFromProps(pathSplit[6]);
    let page = this.getPageFromProps(Number(pathSplit[8]));

    let form: GetPersonDetails = {
      username: username,
      sort,
      saved_only: view === PersonDetailsView.Saved,
      page,
      limit: fetchLimit,
      auth: req.auth,
    };
    return [req.client.getPersonDetails(form)];
  }

  componentDidMount() {
    this.setPersonBlock();
    setupTippy();
  }

  componentWillUnmount() {
    this.subscription?.unsubscribe();
    saveScrollPosition(this.context);
  }

  static getDerivedStateFromProps(props: any): ProfileProps {
    return {
      view: this.getViewFromProps(props.match.params.view),
      sort: this.getSortTypeFromProps(props.match.params.sort),
      page: this.getPageFromProps(props.match.params.page),
      person_id: props.match.params.id || null,
      username: props.match.params.username,
    };
  }

  componentDidUpdate(lastProps: any) {
    // Necessary if you are on a post and you click another post (same route)
    if (
      lastProps.location.pathname.split("/")[2] !==
      lastProps.history.location.pathname.split("/")[2]
    ) {
      // Couldnt get a refresh working. This does for now.
      location.reload();
    }
  }

  get documentTitle(): string {
    let res = this.state.personRes;
    return res
      ? `@${res.person_view.person.name} - ${this.state.siteRes.site_view.site.name}`
      : "";
  }

  render() {
    let res = this.state.personRes;
    return (
      <div className="container-lg">
        {this.state.loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          res && (
            <div className="row">
              <div className="col-12 col-md-8">
                <>
                  <HtmlTags
                    title={this.documentTitle}
                    path={this.context.router.route.match.url}
                    description={res.person_view.person.bio}
                    image={res.person_view.person.avatar}
                  />
                  {this.userInfo()}
                  <hr />
                </>
                {!this.state.loading && this.selects()}
                <PersonDetails
                  personRes={res}
                  admins={this.state.siteRes.admins}
                  sort={this.state.sort}
                  page={this.state.page}
                  limit={fetchLimit}
                  enableDownvotes={enableDownvotes(this.state.siteRes)}
                  enableNsfw={enableNsfw(this.state.siteRes)}
                  view={this.state.view}
                  onPageChange={this.handlePageChange}
                  allLanguages={this.state.siteRes.all_languages}
                  siteLanguages={this.state.siteRes.discussion_languages}
                />
              </div>

              {!this.state.loading && (
                <div className="col-12 col-md-4">
                  {this.moderates()}
                  {this.amCurrentUser && this.follows()}
                </div>
              )}
            </div>
          )
        )}
      </div>
    );
  }

  viewRadios() {
    return (
      <div className="btn-group btn-group-toggle flex-wrap mb-2">
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.view == PersonDetailsView.Overview && "active"}
          `}
        >
          <input
            type="radio"
            value={PersonDetailsView.Overview}
            checked={this.state.view === PersonDetailsView.Overview}
            onChange={linkEvent(this, this.handleViewChange)}
          />
          {i18n.t("overview")}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.view == PersonDetailsView.Comments && "active"}
          `}
        >
          <input
            type="radio"
            value={PersonDetailsView.Comments}
            checked={this.state.view == PersonDetailsView.Comments}
            onChange={linkEvent(this, this.handleViewChange)}
          />
          {i18n.t("comments")}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.view == PersonDetailsView.Posts && "active"}
          `}
        >
          <input
            type="radio"
            value={PersonDetailsView.Posts}
            checked={this.state.view == PersonDetailsView.Posts}
            onChange={linkEvent(this, this.handleViewChange)}
          />
          {i18n.t("posts")}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.view == PersonDetailsView.Saved && "active"}
          `}
        >
          <input
            type="radio"
            value={PersonDetailsView.Saved}
            checked={this.state.view == PersonDetailsView.Saved}
            onChange={linkEvent(this, this.handleViewChange)}
          />
          {i18n.t("saved")}
        </label>
      </div>
    );
  }

  selects() {
    let profileRss = `/feeds/u/${this.state.userName}.xml?sort=${this.state.sort}`;

    return (
      <div className="mb-2">
        <span className="mr-3">{this.viewRadios()}</span>
        <SortSelect
          sort={this.state.sort}
          onChange={this.handleSortChange}
          hideHot
          hideMostComments
        />
        <a href={profileRss} rel={relTags} title="RSS">
          <Icon icon="rss" classes="text-muted small mx-2" />
        </a>
        <link rel="alternate" type="application/atom+xml" href={profileRss} />
      </div>
    );
  }
  handleBlockPerson(personId: string) {
    let auth = myAuth();
    if (auth) {
      if (personId != null) {
        let blockUserForm: BlockPerson = {
          person_id: personId,
          block: true,
          auth,
        };
        WebSocketService.Instance.send(wsClient.blockPerson(blockUserForm));
      }
    }
  }
  handleUnblockPerson(recipientId: string) {
    let auth = myAuth();
    if (auth) {
      let blockUserForm: BlockPerson = {
        person_id: recipientId,
        block: false,
        auth,
      };
      WebSocketService.Instance.send(wsClient.blockPerson(blockUserForm));
    }
  }

  userInfo() {
    let pv = this.state.personRes?.person_view;
    return (
      pv && (
        <div>
          <BannerIconHeader banner={pv.person.banner} icon={pv.person.avatar} />
          <div className="mb-3">
            <div className="">
              <div className="mb-0 d-flex flex-wrap">
                <div>
                  {pv.person.display_name && (
                    <h5 className="mb-0">{pv.person.display_name}</h5>
                  )}
                  <ul className="list-inline mb-2">
                    <li className="list-inline-item">
                      <PersonListing
                        person={pv.person}
                        realLink
                        useApubName
                        muted
                        hideAvatar
                      />
                    </li>
                    {isBanned(pv.person) && (
                      <li className="list-inline-item badge badge-danger">
                        {i18n.t("banned")}
                      </li>
                    )}
                    {pv.person.deleted && (
                      <li className="list-inline-item badge badge-danger">
                        {i18n.t("deleted")}
                      </li>
                    )}
                    {pv.person.admin && (
                      <li className="list-inline-item badge badge-light">
                        {i18n.t("admin")}
                      </li>
                    )}
                    {pv.person.bot_account && (
                      <li className="list-inline-item badge badge-light">
                        {i18n.t("bot_account").toLowerCase()}
                      </li>
                    )}
                  </ul>
                </div>
                {this.banDialog()}
                <div className="flex-grow-1 unselectable pointer mx-2"></div>
                {!this.amCurrentUser && UserService.Instance.myUserInfo && (
                  <>
                    <a
                      className={`d-flex align-self-start btn btn-secondary mr-2 ${
                        !pv.person.matrix_user_id && "invisible"
                      }`}
                      rel={relTags}
                      href={`https://matrix.to/#/${pv.person.matrix_user_id}`}
                    >
                      {i18n.t("send_secure_message")}
                    </a>
                    <Link
                      className={
                        "d-flex align-self-start btn btn-secondary mr-2"
                      }
                      to={`/create_private_message/recipient/${pv.person.id}`}
                    >
                      {i18n.t("send_message")}
                    </Link>
                    {this.state.personBlocked ? (
                      <button
                        className={
                          "d-flex align-self-start btn btn-secondary mr-2"
                        }
                        onClick={linkEvent(
                          pv.person.id,
                          this.handleUnblockPerson
                        )}
                      >
                        {i18n.t("unblock_user")}
                      </button>
                    ) : (
                      <button
                        className={
                          "d-flex align-self-start btn btn-secondary mr-2"
                        }
                        onClick={linkEvent(
                          pv.person.id,
                          this.handleBlockPerson
                        )}
                      >
                        {i18n.t("block_user")}
                      </button>
                    )}
                  </>
                )}

                {canMod(pv.person.id, undefined, this.state.siteRes.admins) &&
                  !isAdmin(pv.person.id, this.state.siteRes.admins) &&
                  !this.state.showBanDialog &&
                  (!isBanned(pv.person) ? (
                    <button
                      className={
                        "d-flex align-self-start btn btn-secondary mr-2"
                      }
                      onClick={linkEvent(this, this.handleModBanShow)}
                      aria-label={i18n.t("ban")}
                    >
                      {capitalizeFirstLetter(i18n.t("ban"))}
                    </button>
                  ) : (
                    <button
                      className={
                        "d-flex align-self-start btn btn-secondary mr-2"
                      }
                      onClick={linkEvent(this, this.handleModBanSubmit)}
                      aria-label={i18n.t("unban")}
                    >
                      {capitalizeFirstLetter(i18n.t("unban"))}
                    </button>
                  ))}
              </div>
              {pv.person.bio && (
                <div className="d-flex align-items-center mb-2">
                  <div
                    className="md-div"
                    dangerouslySetInnerHTML={mdToHtml(pv.person.bio)}
                  />
                </div>
              )}
              <div>
                <ul className="list-inline mb-2">
                  <li className="list-inline-item badge badge-light">
                    {i18n.t("number_of_posts", {
                      count: pv.counts.post_count,
                      formattedCount: numToSI(pv.counts.post_count),
                    })}
                  </li>
                  <li className="list-inline-item badge badge-light">
                    {i18n.t("number_of_comments", {
                      count: pv.counts.comment_count,
                      formattedCount: numToSI(pv.counts.comment_count),
                    })}
                  </li>
                </ul>
              </div>
              <div className="text-muted">
                {i18n.t("joined")}{" "}
                <MomentTime
                  published={pv.person.published}
                  showAgo
                  ignoreUpdated
                />
              </div>
              <div className="d-flex align-items-center text-muted mb-2">
                <Icon icon="cake" />
                <span className="ml-2">
                  {i18n.t("cake_day_title")}{" "}
                  {moment
                    .utc(pv.person.published)
                    .local()
                    .format("MMM DD, YYYY")}
                </span>
              </div>
              {/* <div className="flex-grow-1 unselectable pointer mx-2"></div> */}
              {/* {!this.amCurrentUser && (
                <>
                  <a
                    className={`d-flex align-self-start btn btn-secondary mr-2 ${
                      !pv.person.matrix_user_id && "invisible"
                    }`}
                    rel="noopener"
                    href={`https://matrix.to/#/${pv.person.matrix_user_id}`}
                  >
                    {i18n.t("send_secure_message")}
                  </a>
                  <Link
                    className={"d-flex align-self-start btn btn-secondary"}
                    to={`/create_private_message/recipient/${pv.person.id}`}
                  >
                    {i18n.t("send_message")}
                  </Link>
                </>
              )} */}
              <hr />
              {/* <div className="mb-2">
                <a
                  className="btn btn-secondary btn-block  mr-2 "
                  href="#"
                  onClick={linkEvent(this, this.handleBlockchainClick)}
                >
                  {i18n.t("Blockchain")}
                </a>
              </div> */}
            </div>

            {pv.person.bio && (
              <div className="d-flex align-items-center mb-2">
                <div
                  className="md-div"
                  dangerouslySetInnerHTML={mdToHtml(pv.person.bio)}
                />
              </div>
            )}

            <div>
              <ul className="list-inline mb-2">
                <li className="list-inline-item badge badge-light">
                  {i18n.t("number_of_posts", {
                    count: pv.counts.post_count,
                    formattedCount: numToSI(pv.counts.post_count),
                  })}
                </li>
                <li className="list-inline-item badge badge-light">
                  {i18n.t("number_of_comments", {
                    count: pv.counts.comment_count,
                    formattedCount: numToSI(pv.counts.comment_count),
                  })}
                </li>
              </ul>
            </div>
            <div className="text-muted">
              {i18n.t("joined")}{" "}
              <MomentTime data={pv.person} showAgo ignoreUpdated />
            </div>
            <div className="d-flex align-items-center text-muted mb-2">
              <Icon icon="cake" />
              <span className="ml-2">
                {i18n.t("cake_day_title")}{" "}
                {moment.utc(pv.person.published).local().format("MMM DD, YYYY")}
              </span>
            </div>
          </div>
        </div>
      )
    );
  }

  banDialog() {
    let pv = this.state.personRes?.person_view;
    return (
      pv && (
        <>
          {this.state.showBanDialog && (
            <form onSubmit={linkEvent(this, this.handleModBanSubmit)}>
              <div className="form-group row col-12">
                <label className="col-form-label" htmlFor="profile-ban-reason">
                  {i18n.t("reason")}
                </label>
                <input
                  type="text"
                  id="profile-ban-reason"
                  className="form-control mr-2"
                  placeholder={i18n.t("reason")}
                  value={this.state.banReason}
                  onInput={linkEvent(this, this.handleModBanReasonChange)}
                />
                <label className="col-form-label" htmlFor={`mod-ban-expires`}>
                  {i18n.t("expires")}
                </label>
                <input
                  type="number"
                  id={`mod-ban-expires`}
                  className="form-control mr-2"
                  placeholder={i18n.t("number_of_days")}
                  value={this.state.banExpireDays}
                  onInput={linkEvent(this, this.handleModBanExpireDaysChange)}
                />
                <div className="form-group">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      id="mod-ban-remove-data"
                      type="checkbox"
                      checked={this.state.removeData}
                      onChange={linkEvent(this, this.handleModRemoveDataChange)}
                    />
                    <label
                      className="form-check-label"
                      htmlFor="mod-ban-remove-data"
                      title={i18n.t("remove_content_more")}
                    >
                      {i18n.t("remove_content")}
                    </label>
                  </div>
                </div>
              </div>
              {/* TODO hold off on expires until later */}
              {/* <div class="form-group row"> */}
              {/*   <label class="col-form-label">Expires</label> */}
              {/*   <input type="date" class="form-control mr-2" placeholder={i18n.t('expires')} value={this.state.banExpires} onInput={linkEvent(this, this.handleModBanExpiresChange)} /> */}
              {/* </div> */}
              <div className="form-group row">
                <button
                  type="reset"
                  className="btn btn-secondary mr-2"
                  aria-label={i18n.t("cancel")}
                  onClick={linkEvent(this, this.handleModBanSubmitCancel)}
                >
                  {i18n.t("cancel")}
                </button>
                <button
                  type="submit"
                  className="btn btn-secondary"
                  aria-label={i18n.t("ban")}
                >
                  {i18n.t("ban")} {pv.person.name}
                </button>
              </div>
            </form>
          )}
        </>
      )
    );
  }

  moderates() {
    let moderates = this.state.personRes?.moderates;
    return (
      moderates &&
      moderates.length > 0 && (
        <div className="card border-secondary mb-3">
          <div className="card-body">
            <h5>{i18n.t("moderates")}</h5>
            <ul className="list-unstyled mb-0">
              {moderates.map(cmv => (
                <li key={cmv.community.id}>
                  <CommunityLink community={cmv.community} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )
    );
  }

  follows() {
    let follows = UserService.Instance.myUserInfo?.follows;
    return (
      follows &&
      follows.length > 0 && (
        <div className="card border-secondary mb-3">
          <div className="card-body">
            <h5>{i18n.t("subscribed")}</h5>
            <ul className="list-unstyled mb-0">
              {follows.map(cfv => (
                <li key={cfv.community.id}>
                  <CommunityLink community={cfv.community} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )
    );
  }

  updateUrl(paramUpdates: UrlParams) {
    const page = paramUpdates.page || this.state.page;
    const viewStr = paramUpdates.view || PersonDetailsView[this.state.view];
    const sortStr = paramUpdates.sort || this.state.sort;

    let typeView = `/u/${this.state.userName}`;

    this.props.history.push(
      `${typeView}/view/${viewStr}/sort/${sortStr}/page/${page}`
    );
    this.setState({ loading: true });
    this.fetchUserData();
  }

  handlePageChange(page: number) {
    this.updateUrl({ page: page });
  }

  handleSortChange(val: SortType) {
    this.updateUrl({ sort: val, page: 1 });
  }

  handleViewChange(i: Profile, event: any) {
    i.updateUrl({
      view: PersonDetailsView[Number(event.target.value)],
      page: 1,
    });
  }

  handleModBanShow(i: Profile) {
    i.setState({ showBanDialog: true });
  }

  handleModBanReasonChange(i: Profile, event: any) {
    i.setState({ banReason: event.target.value });
  }

  handleModBanExpireDaysChange(i: Profile, event: any) {
    i.setState({ banExpireDays: event.target.value });
  }

  handleModRemoveDataChange(i: Profile, event: any) {
    i.setState({ removeData: event.target.checked });
  }

  handleModBanSubmitCancel(i: Profile, event?: any) {
    event.preventDefault();
    i.setState({ showBanDialog: false });
  }

  handleModBanSubmit(i: Profile, event?: any) {
    if (event) event.preventDefault();
    let person = i.state.personRes?.person_view.person;
    let auth = myAuth();
    if (person && auth) {
      // If its an unban, restore all their data
      let ban = !person.banned;
      if (ban == false) {
        i.setState({ removeData: false });
      }
      let form: BanPerson = {
        person_id: person.id,
        ban,
        remove_data: i.state.removeData,
        reason: i.state.banReason,
        expires: futureDaysToUnixTime(i.state.banExpireDays),
        auth,
      };
      WebSocketService.Instance.send(wsClient.banPerson(form));

      i.setState({ showBanDialog: false });
    }
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      if (msg.error == "couldnt_find_that_username_or_email") {
        this.context.router.history.push("/");
      }
      return;
    } else if (msg.reconnect) {
      this.fetchUserData();
    } else if (op == UserOperation.GetPersonDetails) {
      // Since the PersonDetails contains posts/comments as well as some general user info we listen here as well
      // and set the parent state if it is not set or differs
      // TODO this might need to get abstracted
      let data = wsJsonToRes<GetPersonDetailsResponse>(msg);
      this.setState({ personRes: data, loading: false });
      this.setPersonBlock();
      restoreScrollPosition(this.context);
    } else if (op == UserOperation.AddAdmin) {
      let data = wsJsonToRes<AddAdminResponse>(msg);
      this.setState(s => ((s.siteRes.admins = data.admins), s));
    } else if (op == UserOperation.CreateCommentLike) {
      let data = wsJsonToRes<CommentResponse>(msg);
      createCommentLikeRes(data.comment_view, this.state.personRes?.comments);
      this.setState(this.state);
    } else if (
      op == UserOperation.EditComment ||
      op == UserOperation.DeleteComment ||
      op == UserOperation.RemoveComment
    ) {
      let data = wsJsonToRes<CommentResponse>(msg);
      editCommentRes(data.comment_view, this.state.personRes?.comments);
      this.setState(this.state);
    } else if (op == UserOperation.CreateComment) {
      let data = wsJsonToRes<CommentResponse>(msg);
      let mui = UserService.Instance.myUserInfo;
      if (data.comment_view.creator.id == mui?.local_user_view.person.id) {
        toast(i18n.t("reply_sent"));
      }
    } else if (op == UserOperation.SaveComment) {
      let data = wsJsonToRes<CommentResponse>(msg);
      saveCommentRes(data.comment_view, this.state.personRes?.comments);
      this.setState(this.state);
    } else if (
      op == UserOperation.EditPost ||
      op == UserOperation.DeletePost ||
      op == UserOperation.RemovePost ||
      op == UserOperation.LockPost ||
      op == UserOperation.FeaturePost ||
      op == UserOperation.SavePost
    ) {
      let data = wsJsonToRes<PostResponse>(msg);
      editPostFindRes(data.post_view, this.state.personRes?.posts);
      this.setState(this.state);
    } else if (op == UserOperation.CreatePostLike) {
      let data = wsJsonToRes<PostResponse>(msg);
      createPostLikeFindRes(data.post_view, this.state.personRes?.posts);
      this.setState(this.state);
    } else if (op == UserOperation.BanPerson) {
      let data = wsJsonToRes<BanPersonResponse>(msg);
      let res = this.state.personRes;
      res?.comments
        .filter(c => c.creator.id == data.person_view.person.id)
        .forEach(c => (c.creator.banned = data.banned));
      res?.posts
        .filter(c => c.creator.id == data.person_view.person.id)
        .forEach(c => (c.creator.banned = data.banned));
      let pv = res?.person_view;

      if (pv?.person.id == data.person_view.person.id) {
        pv.person.banned = data.banned;
      }
      this.setState(this.state);
    } else if (op == UserOperation.BlockPerson) {
      let data = wsJsonToRes<BlockPersonResponse>(msg);
      updatePersonBlock(data);
      this.setPersonBlock();
      this.setState(this.state);
    } else if (
      op == UserOperation.PurgePerson ||
      op == UserOperation.PurgePost ||
      op == UserOperation.PurgeComment ||
      op == UserOperation.PurgeCommunity
    ) {
      let data = wsJsonToRes<PurgeItemResponse>(msg);
      if (data.success) {
        toast(i18n.t("purge_success"));
        this.context.router.history.push(`/`);
      }
    }
  }

  get isPiBrowser(): boolean {
    return isBrowser() && navigator.userAgent.includes("PiBrowser");
  }

  async handleBlockchainClick(i: Profile) {
    if (i.isPiBrowser) {
      await i.handlePiBlockchainClick(i);
      return;
    }
    const isMetaMaskInstalled = () => {
      //Have to check the ethereum binding on the window object to see if it's installed
      const { ethereum } = window;
      return Boolean(ethereum && ethereum.isMetaMask);
    };

    var config;
    i.state.personRes
      .map(r => r.person_view.person)
      .match({
        some: person => {
          config = {
            memo: "profile",
            metadata: {
              id: person.id,
              name: person.name,
              display: person.display_name,
              actor_id: person.actor_id,
              t: person.published,
              u: person.updated,
              s: person.auth_sign,
            },
          };
        },
        none: void 0,
      });

    var str = utf8ToHex(JSON.stringify(config));
    if (isMetaMaskInstalled()) {
      try {
        var accounts = await ethereum.request({
          method: "eth_requestAccounts",
        });
        ethereum
          .request({
            method: "eth_sendTransaction",
            params: [
              {
                from: accounts[0],
                to: web3AnchorAddress,
                gasPrice: gasPrice,
                value: eth001,
                data: "0x" + str,
              },
            ],
          })
          .then(txHash => console.log(txHash))
          .catch(error => console.error(error));
      } catch (error) {
        console.log(error);
      }
    }
  }

  async handlePiBlockchainClick(i: Profile) {
    var config;
    let person = i.state.personRes?.person_view.person;
    if (person) {
      config = {
        amount: 0.00001,
        memo: "profile",
        metadata: {
          id: person.id,
          name: person.name,
          display: person.display_name,
          actor_id: person.actor_id,
          t: person.published,
          u: person.updated,
          s: person.srv_sign,
        },
      };

      try {
        let auth = myAuth(false);
        await createPayment(config, window.location.hostname, person.id, auth);
      } catch (err) {
        console.log(
          "Pi createPayment for profile error:" + JSON.stringify(err)
        );
      }
    }
  }
}
