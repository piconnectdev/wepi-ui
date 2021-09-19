import { Component, linkEvent } from "inferno";
import { Link } from "inferno-router";
import {
  AddModToCommunity,
  CommunityModeratorView,
  CommunityView,
  DeleteCommunity,
  FollowCommunity,
  PersonViewSafe,
  RemoveCommunity,
} from "lemmy-js-client";
import { i18n } from "../../i18next";
import { UserService, WebSocketService } from "../../services";
import { authField, getUnixTime, mdToHtml, wsClient,
  utf8ToHex,
  web3AnchorAddress,
  web3TipAddress,
  eth001,
  eth01,
  isBrowser,
  gasPrice,
 } from "../../utils";
import { BannerIconHeader } from "../common/banner-icon-header";
import { Icon } from "../common/icon";
import { CommunityForm } from "../community/community-form";
import { CommunityLink } from "../community/community-link";
import { PersonListing } from "../person/person-listing";
import axios from '../../axios';

interface SidebarProps {
  community_view: CommunityView;
  moderators: CommunityModeratorView[];
  admins: PersonViewSafe[];
  online: number;
  enableNsfw: boolean;
  showIcon?: boolean;
}

interface SidebarState {
  showEdit: boolean;
  showRemoveDialog: boolean;
  removeReason: string;
  removeExpires: string;
  showConfirmLeaveModTeam: boolean;
}

export class Sidebar extends Component<SidebarProps, SidebarState> {
  private emptyState: SidebarState = {
    showEdit: false,
    showRemoveDialog: false,
    removeReason: null,
    removeExpires: null,
    showConfirmLeaveModTeam: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.state = this.emptyState;
    this.handleEditCommunity = this.handleEditCommunity.bind(this);
    this.handleEditCancel = this.handleEditCancel.bind(this);
  }

  render() {
    return (
      <div>
        {!this.state.showEdit ? (
          this.sidebar()
        ) : (
          <CommunityForm
            community_view={this.props.community_view}
            onEdit={this.handleEditCommunity}
            onCancel={this.handleEditCancel}
            enableNsfw={this.props.enableNsfw}
          />
        )}
      </div>
    );
  }

  sidebar() {
    return (
      <div>
        <div class="card border-secondary mb-3">
          <div class="card-body">
            {this.communityTitle()}
            {this.adminButtons()}
            {this.subscribe()}
            {this.createPost()}
          </div>
        </div>
        <div class="card border-secondary mb-3">
          <div class="card-body">
            {this.description()}
            {this.badges()}
            {this.mods()}
          </div>
        </div>
      </div>
    );
  }

  communityTitle() {
    let community = this.props.community_view.community;
    let subscribed = this.props.community_view.subscribed;
    return (
      <div>
        <h5 className="mb-0">
          {this.props.showIcon && (
            <BannerIconHeader icon={community.icon} banner={community.banner} />
          )}
          <span class="mr-2">{community.title}</span>
          {subscribed && (
            <a
              class="btn btn-secondary btn-sm mr-2"
              href="#"
              onClick={linkEvent(this, this.handleUnsubscribe)}
            >
              <Icon icon="check" classes="icon-inline text-success mr-1" />
              {i18n.t("joined")}
            </a>
          )}
          {community.removed && (
            <small className="mr-2 text-muted font-italic">
              {i18n.t("removed")}
            </small>
          )}
          {community.deleted && (
            <small className="mr-2 text-muted font-italic">
              {i18n.t("deleted")}
            </small>
          )}
          {community.nsfw && (
            <small className="mr-2 text-muted font-italic">
              {i18n.t("nsfw")}
            </small>
          )}
        </h5>
        <CommunityLink
          community={community}
          realLink
          useApubName
          muted
          hideAvatar
        />
      </div>
    );
  }

  badges() {
    let community_view = this.props.community_view;
    let counts = community_view.counts;
    return (
      <ul class="my-1 list-inline">
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_online", { count: this.props.online })}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={`${i18n.t("number_of_users", {
            count: counts.users_active_day,
          })} ${i18n.t("active_in_the_last")} ${i18n.t("day")}`}
        >
          {i18n.t("number_of_users", {
            count: counts.users_active_day,
          })}{" "}
          / {i18n.t("day")}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={`${i18n.t("number_of_users", {
            count: counts.users_active_week,
          })} ${i18n.t("active_in_the_last")} ${i18n.t("week")}`}
        >
          {i18n.t("number_of_users", {
            count: counts.users_active_week,
          })}{" "}
          / {i18n.t("week")}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={`${i18n.t("number_of_users", {
            count: counts.users_active_month,
          })} ${i18n.t("active_in_the_last")} ${i18n.t("month")}`}
        >
          {i18n.t("number_of_users", {
            count: counts.users_active_month,
          })}{" "}
          / {i18n.t("month")}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={`${i18n.t("number_of_users", {
            count: counts.users_active_half_year,
          })} ${i18n.t("active_in_the_last")} ${i18n.t("number_of_months", {
            count: 6,
          })}`}
        >
          {i18n.t("number_of_users", {
            count: counts.users_active_half_year,
          })}{" "}
          / {i18n.t("number_of_months", { count: 6 })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_of_subscribers", {
            count: counts.subscribers,
          })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_of_posts", {
            count: counts.posts,
          })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_of_comments", {
            count: counts.comments,
          })}
        </li>
        <li className="list-inline-item">
          <Link
            className="badge badge-secondary"
            to={`/modlog/community/${this.props.community_view.community.id}`}
          >
            {i18n.t("modlog")}
          </Link>
        </li>
      </ul>
    );
  }

  mods() {
    return (
      <ul class="list-inline small">
        <li class="list-inline-item">{i18n.t("mods")}: </li>
        {this.props.moderators.map(mod => (
          <li class="list-inline-item">
            <PersonListing person={mod.moderator} />
          </li>
        ))}
      </ul>
    );
  }

  createPost() {
    let community_view = this.props.community_view;
    return (
      community_view.subscribed && (
        <Link
          className={`btn btn-secondary btn-block mb-2 ${
            community_view.community.deleted || community_view.community.removed
              ? "no-click"
              : ""
          }`}
          to={`/create_post?community_id=${community_view.community.id}`}
        >
          {i18n.t("create_a_post")}
        </Link>
      )
    );
  }

  subscribe() {
    let community_view = this.props.community_view;
    return (
      <div class="mb-2">
        {!community_view.subscribed && (
          <a
            class="btn btn-secondary btn-block"
            href="#"
            onClick={linkEvent(this, this.handleSubscribe)}
          >
            {i18n.t("subscribe")}
          </a>
        )}
      </div>
    );
  }

  description() {
    let description = this.props.community_view.community.description;
    return (
      description && (
        <div
          className="md-div"
          dangerouslySetInnerHTML={mdToHtml(description)}
        />
      )
    );
  }

  adminButtons() {
    let community_view = this.props.community_view;
    return (
      <>
        <ul class="list-inline mb-1 text-muted font-weight-bold">
          {this.canMod && (
            <>
            { !this.isPiBrowser && (
            <li className="list-inline-item-action">
                <button
                  class="btn btn-link text-muted d-inline-block"
                  onClick={linkEvent(this, this.handleBlockchainClick)}
                  data-tippy-content={i18n.t("to blockchain")}
                  aria-label={i18n.t("blockchain")}
                >
                  <Icon icon="zap" classes="icon-inline" />
                </button>
              </li>
            )}
            { this.isPiBrowser && (
            <li className="list-inline-item-action">
                <button
                  class="btn btn-link text-muted d-inline-block"
                  onClick={linkEvent(this, this.handlePiBlockchainClick)}
                  data-tippy-content={i18n.t("to pi blockchain")}
                  aria-label={i18n.t("to pi blockchain")}
                >
                  <Icon icon="zap" classes="icon-inline" />
                </button>
              </li>
            )}
              <li className="list-inline-item-action">
                <button
                  class="btn btn-link text-muted d-inline-block"
                  onClick={linkEvent(this, this.handleEditClick)}
                  data-tippy-content={i18n.t("edit")}
                  aria-label={i18n.t("edit")}
                >
                  <Icon icon="edit" classes="icon-inline" />
                </button>
              </li>
              {!this.amTopMod &&
                (!this.state.showConfirmLeaveModTeam ? (
                  <li className="list-inline-item-action">
                    <button
                      class="btn btn-link text-muted d-inline-block"
                      onClick={linkEvent(
                        this,
                        this.handleShowConfirmLeaveModTeamClick
                      )}
                    >
                      {i18n.t("leave_mod_team")}
                    </button>
                  </li>
                ) : (
                  <>
                    <li className="list-inline-item-action">
                      {i18n.t("are_you_sure")}
                    </li>
                    <li className="list-inline-item-action">
                      <button
                        class="btn btn-link text-muted d-inline-block"
                        onClick={linkEvent(this, this.handleLeaveModTeamClick)}
                      >
                        {i18n.t("yes")}
                      </button>
                    </li>
                    <li className="list-inline-item-action">
                      <button
                        class="btn btn-link text-muted d-inline-block"
                        onClick={linkEvent(
                          this,
                          this.handleCancelLeaveModTeamClick
                        )}
                      >
                        {i18n.t("no")}
                      </button>
                    </li>
                  </>
                ))}
              {this.amTopMod && (
                <li className="list-inline-item-action">
                  <button
                    class="btn btn-link text-muted d-inline-block"
                    onClick={linkEvent(this, this.handleDeleteClick)}
                    data-tippy-content={
                      !community_view.community.deleted
                        ? i18n.t("delete")
                        : i18n.t("restore")
                    }
                    aria-label={
                      !community_view.community.deleted
                        ? i18n.t("delete")
                        : i18n.t("restore")
                    }
                  >
                    <Icon
                      icon="trash"
                      classes={`icon-inline ${
                        community_view.community.deleted && "text-danger"
                      }`}
                    />
                  </button>
                </li>
              )}
            </>
          )}
          {this.canAdmin && (
            <li className="list-inline-item">
              {!this.props.community_view.community.removed ? (
                <button
                  class="btn btn-link text-muted d-inline-block"
                  onClick={linkEvent(this, this.handleModRemoveShow)}
                >
                  {i18n.t("remove")}
                </button>
              ) : (
                <button
                  class="btn btn-link text-muted d-inline-block"
                  onClick={linkEvent(this, this.handleModRemoveSubmit)}
                >
                  {i18n.t("restore")}
                </button>
              )}
            </li>
          )}
        </ul>
        {this.state.showRemoveDialog && (
          <form onSubmit={linkEvent(this, this.handleModRemoveSubmit)}>
            <div class="form-group row">
              <label class="col-form-label" htmlFor="remove-reason">
                {i18n.t("reason")}
              </label>
              <input
                type="text"
                id="remove-reason"
                class="form-control mr-2"
                placeholder={i18n.t("optional")}
                value={this.state.removeReason}
                onInput={linkEvent(this, this.handleModRemoveReasonChange)}
              />
            </div>
            {/* TODO hold off on expires for now */}
            {/* <div class="form-group row"> */}
            {/*   <label class="col-form-label">Expires</label> */}
            {/*   <input type="date" class="form-control mr-2" placeholder={i18n.t('expires')} value={this.state.removeExpires} onInput={linkEvent(this, this.handleModRemoveExpiresChange)} /> */}
            {/* </div> */}
            <div class="form-group row">
              <button type="submit" class="btn btn-secondary">
                {i18n.t("remove_community")}
              </button>
            </div>
          </form>
        )}
      </>
    );
  }

  get isPiBrowser(): boolean {
    return isBrowser() && navigator.userAgent.includes('PiBrowser') ;
  }
  
  handleEditClick(i: Sidebar) {
    i.state.showEdit = true;
    i.setState(i.state);
  }

  handleEditCommunity() {
    this.state.showEdit = false;
    this.setState(this.state);
  }

  handleEditCancel() {
    this.state.showEdit = false;
    this.setState(this.state);
  }

  handleDeleteClick(i: Sidebar, event: any) {
    event.preventDefault();
    let deleteForm: DeleteCommunity = {
      community_id: i.props.community_view.community.id,
      deleted: !i.props.community_view.community.deleted,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.deleteCommunity(deleteForm));
  }

  handleShowConfirmLeaveModTeamClick(i: Sidebar) {
    i.state.showConfirmLeaveModTeam = true;
    i.setState(i.state);
  }

  handleLeaveModTeamClick(i: Sidebar) {
    let form: AddModToCommunity = {
      person_id: UserService.Instance.myUserInfo.local_user_view.person.id,
      community_id: i.props.community_view.community.id,
      added: false,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.addModToCommunity(form));
    i.state.showConfirmLeaveModTeam = false;
    i.setState(i.state);
  }

  handleCancelLeaveModTeamClick(i: Sidebar) {
    i.state.showConfirmLeaveModTeam = false;
    i.setState(i.state);
  }

  handleUnsubscribe(i: Sidebar, event: any) {
    event.preventDefault();
    let community_id = i.props.community_view.community.id;
    let form: FollowCommunity = {
      community_id,
      follow: false,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.followCommunity(form));

    // Update myUserInfo
    UserService.Instance.myUserInfo.follows =
      UserService.Instance.myUserInfo.follows.filter(
        i => i.community.id != community_id
      );
  }

  handleSubscribe(i: Sidebar, event: any) {
    event.preventDefault();
    let community_id = i.props.community_view.community.id;
    let form: FollowCommunity = {
      community_id,
      follow: true,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.followCommunity(form));

    // Update myUserInfo
    UserService.Instance.myUserInfo.follows.push({
      community: i.props.community_view.community,
      follower: UserService.Instance.myUserInfo.local_user_view.person,
    });
  }

  private get amTopMod(): boolean {
    return (
      this.props.moderators[0].moderator.id ==
      UserService.Instance.myUserInfo.local_user_view.person.id
    );
  }

  get canMod(): boolean {
    return (
      UserService.Instance.myUserInfo &&
      this.props.moderators
        .map(m => m.moderator.id)
        .includes(UserService.Instance.myUserInfo.local_user_view.person.id)
    );
  }

  get canAdmin(): boolean {
    return (
      UserService.Instance.myUserInfo &&
      this.props.admins
        .map(a => a.person.id)
        .includes(UserService.Instance.myUserInfo.local_user_view.person.id)
    );
  }

  handleModRemoveShow(i: Sidebar) {
    i.state.showRemoveDialog = true;
    i.setState(i.state);
  }

  handleModRemoveReasonChange(i: Sidebar, event: any) {
    i.state.removeReason = event.target.value;
    i.setState(i.state);
  }

  handleModRemoveExpiresChange(i: Sidebar, event: any) {
    console.log(event.target.value);
    i.state.removeExpires = event.target.value;
    i.setState(i.state);
  }

  handleModRemoveSubmit(i: Sidebar, event: any) {
    event.preventDefault();
    let removeForm: RemoveCommunity = {
      community_id: i.props.community_view.community.id,
      removed: !i.props.community_view.community.removed,
      reason: i.state.removeReason,
      expires: getUnixTime(i.state.removeExpires),
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.removeCommunity(removeForm));

    i.state.showRemoveDialog = false;
    i.setState(i.state);
  }
  
  async handleBlockchainClick(i: Sidebar) {

    if (this.isPiBrowser) {
      await this.handlePiBlockchainClick(i);
      return;
    }
    const isMetaMaskInstalled = () => {
      //Have to check the ethereum binding on the window object to see if it's installed
      const { ethereum } = window;
      return Boolean(ethereum && ethereum.isMetaMask);
    };

    var config = {
      memo: 'wepi:community',
      metadata: {
          id: i.props.community_view.community.actor_id,
          name: i.props.community_view.community.name,
          title: i.props.community_view.community.title,
          desc: i.props.community_view.community.description,
          banner: i.props.community_view.community.banner,
          actor_id: i.props.community_view.community.actor_id,
          t: i.props.community_view.community.published,
          u: i.props.community_view.community.updated,
          sign: i.props.community_view.community.cert,
      }
    };
    var str = utf8ToHex(JSON.stringify(config));
    if (isMetaMaskInstalled()) {
      try {
        var accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        ethereum.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: accounts[0],
            to: web3AnchorAddress,
            gasPrice: gasPrice,
            value: eth001,
            data: '0x' + str,
          },
        ],
        })
        .then((txHash) => console.log(txHash))
        .catch((error) => console.error);
      } catch(error) {
      }
    }
  }

  async handlePiBlockchainClick(i: Sidebar) {    
    var config = {
      amount: 0.001,
      memo: 'wepi:community',
      metadata: {
          id: i.props.community_view.community.actor_id,
          name: i.props.community_view.community.name,
          title: i.props.community_view.community.title,
          desc: i.props.community_view.community.description,
          banner: i.props.community_view.community.banner,
          actor_id: i.props.community_view.community.actor_id,
          t: i.props.community_view.community.published,
          u: i.props.community_view.community.updated,
          sign: i.props.community_view.community.cert,
      }
    };
    var info= {
      own: null,
      comment: null,
    }
    var piUser;   
    
    const authenticatePiUser = async () => {
        // Identify the user with their username / unique network-wide ID, and get permission to request payments from them.
        const scopes = ['username','payments'];      
        try {
            /// HOW TO CALL Pi.authenticate Global/Init
            var user = await window.Pi.authenticate(scopes, onIncompletePaymentFound);
            return user;
        } catch(err) {
            alert("Pi.authenticate error:" + JSON.stringify(err));
            console.log(err)
        }
    };
    const onIncompletePaymentFound = async (payment) => { 
      const { data } = await axios.post('/pi/found', {
          paymentid: payment.identifier,
          pi_username: piUser.user.username,
          pi_uid: piUser.user.uid,
          person_id: null,
          comment: null,
          auth: null,
          dto: null
      });

      if (data.status >= 200 && data.status < 300) {
          //payment was approved continue with flow
          //alert(payment);
          return data;
      }
    }; // Read more about this in the SDK reference

  const createPiPayment = async (info, config) => {
    //piApiResult = null;
        window.Pi.createPayment(config, {
        // Callbacks you need to implement - read more about those in the detailed docs linked below:
        onReadyForServerApproval: (payment_id) => onReadyForApproval(payment_id, info, config),
        onReadyForServerCompletion:(payment_id, txid) => onReadyForCompletion(payment_id, txid, info, config),
        onCancel: onCancel,
        onError: onError,
      });
  };

  const onReadyForApproval = async (payment_id, info, paymentConfig) => {
      //make POST request to your app server /payments/approve endpoint with paymentId in the body    
      const { data } = await axios.post('/pi/approve', {
        paymentid: payment_id,
        pi_username: piUser.user.username,
        pi_uid: piUser.user.uid,
        person_id: info.own,
        comment: info.comment,
        paymentConfig
      })
      if (data.status >= 200 && data.status < 300) {
          //payment was approved continue with flow
          return data;
      } else {
        //alert("Payment approve error: " + JSON.stringify(data));
      }
    }

    // Update or change password
    const onReadyForCompletion = (payment_id, txid, info, paymentConfig) => {
      //make POST request to your app server /payments/complete endpoint with paymentId and txid in the body
      axios.post('/pi/complete', {
          paymentid: payment_id,
          pi_username: piUser.user.username,
          pi_uid: piUser.user.uid,
          person_id: info.own,
          comment: info.comment,
          txid,
          paymentConfig,
      }).then((data) => {
        //alert("Completing payment data: " + JSON.stringify(data)); 
        
        if (data.status >= 200 && data.status < 300) {
            return true;
        } else {
          alert("Completing payment error: " + JSON.stringify(data));  
        }
        return false;
      });
      return false;
    }

    const onCancel = (paymentId) => {
        console.log('Payment cancelled: ', paymentId)
    }
    const onError = (error, paymentId) => { 
        console.log('Payment error: ', error, paymentId) 
    }

    try {
      piUser = await authenticatePiUser();
      
      await createPiPayment(info, config);
    } catch(err) {
      alert("PiPayment error:" + JSON.stringify(err));
    }
  }

}
