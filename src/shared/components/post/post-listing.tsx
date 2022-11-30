import { None, Option, Some } from "@sniptt/monads";
import classNames from "classnames";
import { Component, linkEvent } from "inferno";
import { Link } from "inferno-router";
import {
  AddAdmin,
  AddModToCommunity,
  BanFromCommunity,
  BanPerson,
  BlockPerson,
  CommunityModeratorView,
  CreatePostLike,
  CreatePostReport,
  DeletePost,
  Language,
  LockPost,
  PersonViewSafe,
  PostView,
  PurgePerson,
  PurgePost,
  RemovePost,
  SavePost,
  StickyPost,
  toUndefined,
  TransferCommunity,
} from "lemmy-js-client";
import axios from "../../axios";
import { externalHost } from "../../env";
import { i18n } from "../../i18next";
import { BanType, PurgeType } from "../../interfaces";
import { UserService, WebSocketService } from "../../services";
import {
  amCommunityCreator,
  auth,
  canAdmin,
  canMod,
  eth001,
  eth01,
  futureDaysToUnixTime,
  gasPrice,
  hostname,
  isAdmin,
  isBanned,
  isBrowser,
  isImage,
  isMod,
  isVideo,
  md,
  mdToHtml,
  numToSI,
  relTags,
  setupTippy,
  showScores,
  utf8ToHex,
  web3AnchorAddress,
  web3TipAddress,
  wsClient,
} from "../../utils";
import { Icon, PurgeWarning, Spinner } from "../common/icon";
import { MomentTime } from "../common/moment-time";
import { PictrsImage } from "../common/pictrs-image";
import { CommunityLink } from "../community/community-link";
import { PersonListing } from "../person/person-listing";
import { MetadataCard } from "./metadata-card";
import { PostForm } from "./post-form";

interface PostListingState {
  showEdit: boolean;
  showRemoveDialog: boolean;
  showPurgeDialog: boolean;
  purgeReason: Option<string>;
  purgeType: PurgeType;
  purgeLoading: boolean;
  removeReason: Option<string>;
  showBanDialog: boolean;
  banReason: Option<string>;
  banExpireDays: Option<number>;
  banType: BanType;
  removeData: boolean;
  showConfirmTransferSite: boolean;
  showConfirmTransferCommunity: boolean;
  imageExpanded: boolean;
  viewSource: boolean;
  showAdvanced: boolean;
  showMoreMobile: boolean;
  showBody: boolean;
  showReportDialog: boolean;
  reportReason: Option<string>;
  my_vote: Option<number>;
  score: number;
  upvotes: number;
  downvotes: number;
}

interface PostListingProps {
  post_view: PostView;
  duplicates: Option<PostView[]>;
  moderators: Option<CommunityModeratorView[]>;
  admins: Option<PersonViewSafe[]>;
  allLanguages: Language[];
  showCommunity?: boolean;
  showBody?: boolean;
  enableDownvotes?: boolean;
  enableNsfw?: boolean;
  viewOnly?: boolean;
}

export class PostListing extends Component<PostListingProps, PostListingState> {
  private emptyState: PostListingState = {
    showEdit: false,
    showRemoveDialog: false,
    showPurgeDialog: false,
    purgeReason: None,
    purgeType: PurgeType.Person,
    purgeLoading: false,
    removeReason: None,
    showBanDialog: false,
    banReason: None,
    banExpireDays: None,
    banType: BanType.Community,
    removeData: false,
    showConfirmTransferSite: false,
    showConfirmTransferCommunity: false,
    imageExpanded: false,
    viewSource: false,
    showAdvanced: false,
    showMoreMobile: false,
    showBody: false,
    showReportDialog: false,
    reportReason: None,
    my_vote: this.props.post_view.my_vote,
    score: this.props.post_view.counts.score,
    upvotes: this.props.post_view.counts.upvotes,
    downvotes: this.props.post_view.counts.downvotes,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
    this.handlePostLike = this.handlePostLike.bind(this);
    this.handlePostDisLike = this.handlePostDisLike.bind(this);
    this.handleEditPost = this.handleEditPost.bind(this);
    this.handleEditCancel = this.handleEditCancel.bind(this);
  }

  componentWillReceiveProps(nextProps: PostListingProps) {
    this.setState({
      my_vote: nextProps.post_view.my_vote,
      upvotes: nextProps.post_view.counts.upvotes,
      downvotes: nextProps.post_view.counts.downvotes,
      score: nextProps.post_view.counts.score,
    });
    if (this.props.post_view.post.id !== nextProps.post_view.post.id) {
      this.setState({ imageExpanded: false });
    }
  }

  render() {
    let post = this.props.post_view.post;
    return (
      <div className="post-listing">
        {!this.state.showEdit ? (
          <>
            {this.listing()}
            {this.state.imageExpanded && this.img}
            {post.url.isSome() &&
              this.showBody &&
              post.embed_title.isSome() && <MetadataCard post={post} />}
            {this.showBody && this.body()}
          </>
        ) : (
          <div className="col-12">
            <PostForm
              post_view={Some(this.props.post_view)}
              communities={None}
              params={None}
              onEdit={this.handleEditPost}
              onCancel={this.handleEditCancel}
              enableNsfw={this.props.enableNsfw}
              enableDownvotes={this.props.enableDownvotes}
              allLanguages={this.props.allLanguages}
            />
          </div>
        )}
      </div>
    );
  }

  body() {
    return this.props.post_view.post.body.match({
      some: body => (
        <div className="col-12 card my-2 p-2">
          {this.state.viewSource ? (
            <pre>{body}</pre>
          ) : (
            <div className="md-div" dangerouslySetInnerHTML={mdToHtml(body)} />
          )}
        </div>
      ),
      none: <></>,
    });
  }

  get img() {
    return this.imageSrc.match({
      some: src => (
        <>
          <div className="offset-sm-3 my-2 d-none d-sm-block">
            <a href={src} className="d-inline-block">
              <PictrsImage src={src} />
            </a>
          </div>
          <div className="my-2 d-block d-sm-none">
            <a
              className="d-inline-block"
              onClick={linkEvent(this, this.handleImageExpandClick)}
            >
              <PictrsImage src={src} />
            </a>
          </div>
        </>
      ),
      none: <></>,
    });
  }

  imgThumb(src: string) {
    let post_view = this.props.post_view;
    return (
      <PictrsImage
        src={src}
        thumbnail
        alt=""
        nsfw={post_view.post.nsfw || post_view.community.nsfw}
      />
    );
  }

  get imageSrc(): Option<string> {
    let post = this.props.post_view.post;
    let url = post.url;
    let thumbnail = post.thumbnail_url;

    if (url.isSome() && isImage(url.unwrap())) {
      if (url.unwrap().includes("pictrs")) {
        return url;
      } else if (thumbnail.isSome()) {
        return thumbnail;
      } else {
        return url;
      }
    } else if (thumbnail.isSome()) {
      return thumbnail;
    } else {
      return None;
    }
  }

  thumbnail() {
    let post = this.props.post_view.post;
    let url = post.url;
    let thumbnail = post.thumbnail_url;

    if (url.isSome() && isImage(url.unwrap())) {
      return (
        <a
          href={this.imageSrc.unwrap()}
          className="text-body d-inline-block position-relative mb-2"
          data-tippy-content={i18n.t("expand_here")}
          onClick={linkEvent(this, this.handleImageExpandClick)}
          aria-label={i18n.t("expand_here")}
        >
          {this.imgThumb(this.imageSrc.unwrap())}
          <Icon icon="image" classes="mini-overlay" />
        </a>
      );
    } else if (url.isSome() && thumbnail.isSome()) {
      return (
        <a
          className="text-body d-inline-block position-relative mb-2"
          href={url.unwrap()}
          rel={relTags}
          title={url.unwrap()}
        >
          {this.imgThumb(this.imageSrc.unwrap())}
          <Icon icon="external-link" classes="mini-overlay" />
        </a>
      );
    } else if (url.isSome()) {
      if (isVideo(url.unwrap())) {
        return (
          <div className="embed-responsive embed-responsive-16by9">
            <video
              playsInline
              muted
              loop
              controls
              className="embed-responsive-item"
            >
              <source src={url.unwrap()} type="video/mp4" />
            </video>
          </div>
        );
      } else {
        return (
          <a
            className="text-body"
            href={url.unwrap()}
            title={url.unwrap()}
            rel={relTags}
          >
            <div className="thumbnail rounded bg-light d-flex justify-content-center">
              <Icon icon="external-link" classes="d-flex align-items-center" />
            </div>
          </a>
        );
      }
    } else {
      return (
        <Link
          className="text-body"
          to={`/post/${post.id}`}
          title={i18n.t("comments")}
        >
          <div className="thumbnail rounded bg-light d-flex justify-content-center">
            <Icon icon="message-square" classes="d-flex align-items-center" />
          </div>
        </Link>
      );
    }
  }

  createdLine() {
    let post_view = this.props.post_view;
    return (
      <ul className="list-inline mb-1 text-muted small">
        <li className="list-inline-item">
          <PersonListing person={post_view.creator} />

          {this.creatorIsMod_ && (
            <span className="mx-1 badge badge-light">{i18n.t("mod")}</span>
          )}
          {this.creatorIsAdmin_ && (
            <span className="mx-1 badge badge-light">{i18n.t("admin")}</span>
          )}
          {post_view.creator.bot_account && (
            <span className="mx-1 badge badge-light">
              {i18n.t("bot_account").toLowerCase()}
            </span>
          )}
          {(post_view.creator_banned_from_community ||
            isBanned(post_view.creator)) && (
            <span className="mx-1 badge badge-danger">{i18n.t("banned")}</span>
          )}
          {post_view.creator_blocked && (
            <span className="mx-1 badge badge-danger">{"blocked"}</span>
          )}
          {this.props.showCommunity && (
            <span>
              <span className="mx-1"> {i18n.t("to")} </span>
              <CommunityLink community={post_view.community} />
            </span>
          )}
        </li>
        <li className="list-inline-item">•</li>
        {post_view.post.url.match({
          some: url =>
            !(hostname(url) == externalHost) && (
              <>
                <li className="list-inline-item">
                  <a
                    className="text-muted font-italic"
                    href={url}
                    title={url}
                    rel={relTags}
                  >
                    {hostname(url)}
                  </a>
                </li>
                <li className="list-inline-item">•</li>
              </>
            ),
          none: <></>,
        })}
        <li className="list-inline-item">
          <span>
            <MomentTime
              published={post_view.post.published}
              updated={post_view.post.updated}
            />
          </span>
        </li>
        {post_view.post.body.match({
          some: body => (
            <>
              <li className="list-inline-item">•</li>
              <li className="list-inline-item">
                <button
                  className="text-muted btn btn-sm btn-link p-0"
                  data-tippy-content={md.render(body)}
                  data-tippy-allowHtml={true}
                  onClick={linkEvent(this, this.handleShowBody)}
                >
                  <Icon icon="book-open" classes="icon-inline mr-1" />
                </button>
              </li>
            </>
          ),
          none: <></>,
        })}
      </ul>
    );
  }

  voteBar() {
    return (
      <div className={`vote-bar col-1 pr-0 small text-center`}>
        <button
          className={`btn-animate btn btn-link p-0 ${
            this.state.my_vote.unwrapOr(0) == 1 ? "text-info" : "text-muted"
          }`}
          onClick={this.handlePostLike}
          data-tippy-content={i18n.t("upvote")}
          aria-label={i18n.t("upvote")}
        >
          <Icon icon="arrow-up1" classes="upvote" />
        </button>
        {showScores() ? (
          <div
            className={`unselectable pointer font-weight-bold text-muted px-1`}
            data-tippy-content={this.pointsTippy}
          >
            {numToSI(this.state.score)}
          </div>
        ) : (
          <div className="p-1"></div>
        )}
        {this.props.enableDownvotes && (
          <button
            className={`btn-animate btn btn-link p-0 ${
              this.state.my_vote.unwrapOr(0) == -1
                ? "text-danger"
                : "text-muted"
            }`}
            onClick={this.handlePostDisLike}
            data-tippy-content={i18n.t("downvote")}
            aria-label={i18n.t("downvote")}
          >
            <Icon icon="arrow-down1" classes="downvote" />
          </button>
        )}
      </div>
    );
  }

  postTitleLine() {
    let post = this.props.post_view.post;
    return (
      <div className="post-title overflow-hidden">
        <h5>
          {post.url.match({
            some: url => (
              <a
                className={!post.stickied ? "text-body" : "text-primary"}
                href={url}
                title={url}
                rel={relTags}
              >
                {post.name}
              </a>
            ),
            none: (
              <Link
                className={!post.stickied ? "text-body" : "text-primary"}
                to={`/post/${post.id}`}
                title={i18n.t("comments")}
              >
                {post.name}
              </Link>
            ),
          })}
          {post.url.map(isImage).or(post.thumbnail_url).unwrapOr(false) && (
            <button
              className="btn btn-link text-monospace text-muted small d-inline-block ml-2"
              data-tippy-content={i18n.t("expand_here")}
              onClick={linkEvent(this, this.handleImageExpandClick)}
            >
              <Icon
                icon={
                  !this.state.imageExpanded ? "plus-square" : "minus-square"
                }
                classes="icon-inline"
              />
            </button>
          )}
          {post.removed && (
            <small className="ml-2 text-muted font-italic">
              {i18n.t("removed")}
            </small>
          )}
          {post.deleted && (
            <small
              className="unselectable pointer ml-2 text-muted font-italic"
              data-tippy-content={i18n.t("deleted")}
            >
              <Icon icon="trash" classes="icon-inline text-danger" />
            </small>
          )}
          {post.locked && (
            <small
              className="unselectable pointer ml-2 text-muted font-italic"
              data-tippy-content={i18n.t("locked")}
            >
              <Icon icon="lock" classes="icon-inline text-danger" />
            </small>
          )}
          {post.stickied && (
            <small
              className="unselectable pointer ml-2 text-muted font-italic"
              data-tippy-content={i18n.t("stickied")}
            >
              <Icon icon="pin" classes="icon-inline text-primary" />
            </small>
          )}
          {post.nsfw && (
            <small className="ml-2 text-muted font-italic">
              {i18n.t("nsfw")}
            </small>
          )}
        </h5>
      </div>
    );
  }

  duplicatesLine() {
    return this.props.duplicates.match({
      some: dupes =>
        dupes.length > 0 && (
          <ul className="list-inline mb-1 small text-muted">
            <>
              <li className="list-inline-item mr-2">
                {i18n.t("cross_posted_to")}
              </li>
              {dupes.map(pv => (
                <li key={pv.post.id} className="list-inline-item mr-2">
                  <Link to={`/post/${pv.post.id}`}>
                    {pv.community.local
                      ? pv.community.name
                      : `${pv.community.name}@${hostname(
                          pv.community.actor_id
                        )}`}
                  </Link>
                </li>
              ))}
            </>
          </ul>
        ),
      none: <></>,
    });
  }

  commentsLine(mobile = false) {
    let post_view = this.props.post_view;
    return (
      <div className="d-flex justify-content-between justify-content-lg-start flex-wrap text-muted font-weight-bold mb-1">
        <button className="btn btn-link text-muted p-0">
          <Link
            className="text-muted small"
            title={i18n.t("number_of_comments", {
              count: post_view.counts.comments,
              formattedCount: post_view.counts.comments,
            })}
            to={`/post/${post_view.post.id}?scrollToComments=true`}
          >
            <Icon icon="message-square" classes="icon-inline mr-1" />
            {i18n.t("number_of_comments", {
              count: post_view.counts.comments,
              formattedCount: numToSI(post_view.counts.comments),
            })}
          </Link>
        </button>
        {!this.isPiBrowser && (
          <button
            className="btn btn-link btn-animate text-muted py-0"
            onClick={linkEvent(this, this.handleTipPostClick)}
            aria-label={i18n.t("tip")}
            data-tippy-content={i18n.t("tip @") + post_view.creator.name}
          >
            {post_view.creator.web3_address && (
              <Icon icon="heart" classes={`icon-inline mr-1}`} />
            )}
            {!post_view.creator.web3_address && (
              <small>
                <Icon icon="heart" classes={`icon-inline mr-1}`} />
              </small>
            )}
          </button>
        )}
        {!this.isPiBrowser && (
          <button
            className="btn btn-link btn-animate text-muted p-0"
            onClick={linkEvent(this, this.handleBlockchainClick)}
            aria-label={i18n.t("blockchain")}
            data-tippy-content={i18n.t("save to blockchain")}
          >
            <Icon icon="zap" classes={`icon-inline mr-1`} />
          </button>
        )}
        {this.isPiBrowser && (
          <button
            className="btn btn-link btn-animate text-muted p-0"
            onClick={linkEvent(this, this.handlePiTipClick)}
            aria-label={i18n.t("tip 0.1 test-π")}
            data-tippy-content={
              i18n.t("tip 0.1 test-π to @") + post_view.creator.name
            }
          >
            {post_view.creator.pi_address && (
              <Icon icon="heart" classes={`icon-inline mr-1`} />
            )}
            {!post_view.creator.pi_address && (
              <small>
                <Icon icon="heart" classes={`icon-inline mr-1`} />
              </small>
            )}
          </button>
        )}
        {this.isPiBrowser && (
          <button
            className="btn btn-link btn-animate text-muted p-0"
            onClick={linkEvent(this, this.handlePiBlockchainClick)}
            aria-label={i18n.t("to pi blockchain")}
            data-tippy-content={i18n.t("save to pi blockchain")}
          >
            <Icon icon="zap" classes={`icon-inline mr-1`} />
          </button>
        )}
        {post_view.post.tx && (
          <button
            className="btn btn-link btn-animate text-muted p-0"
            onClick={linkEvent(this, this.handleLinkBlockchainClick)}
            aria-label={i18n.t("blockchain")}
            data-tippy-content={i18n.t("link on blockchain")}
          >
            <Icon icon="external-link" classes={`icon-inline mr-1`} />
          </button>
        )}
        {/* <button
          class="btn btn-link btn-animate text-muted p-0"
          onClick={linkEvent(this, this.handleTipPostClick)}
          aria-label={i18n.t("explorer")}
          data-tippy-content={i18n.t("explorer") }
        >
          <small>
            <Icon
              icon="external-link"
              classes={`icon-inline mr-1`}
            />
          </small>
        </button> */}
        {!mobile && (
          <>
            {this.state.downvotes !== 0 && showScores() && (
              <button
                className="btn text-muted py-0 pr-0"
                data-tippy-content={this.pointsTippy}
                aria-label={i18n.t("downvote")}
              >
                <small>
                  <Icon icon="arrow-down1" classes="icon-inline mr-1" />
                  <span>{numToSI(this.state.downvotes)}</span>
                </small>
              </button>
            )}
            {!this.showBody && (
              <button
                className="btn btn-link btn-animate text-muted py-0"
                onClick={linkEvent(this, this.handleSavePostClick)}
                data-tippy-content={
                  post_view.saved ? i18n.t("unsave") : i18n.t("save")
                }
                aria-label={post_view.saved ? i18n.t("unsave") : i18n.t("save")}
              >
                <small>
                  <Icon
                    icon="star"
                    classes={`icon-inline ${post_view.saved && "text-warning"}`}
                  />
                </small>
              </button>
            )}
            {/* {!this.showBody && (
              <button
                class="btn btn-link btn-animate text-muted py-0"
                onClick={linkEvent(this, this.handleTipPostClick)}
                aria-label={post_view.saved ? i18n.t("tip1") : i18n.t("tip1")}
                data-tippy-content={
                  i18n.t("tip1") 
                }
                aria-label={i18n.t("tip1")}
              >
                <small>
                  <Icon
                    icon="heart"
                    classes={`icon-inline ${post_view.saved && "text-warning"}`}
                  />
                </small>
              </button>
            )} */}
          </>
        )}
        {/* This is an expanding spacer for mobile */}
        <div className="flex-grow-1"></div>
        {mobile && (
          <>
            <div>
              {showScores() ? (
                <button
                  className={`btn-animate btn py-0 px-1 ${
                    this.state.my_vote == 1 ? "text-info" : "text-muted"
                  }`}
                  data-tippy-content={this.pointsTippy}
                  onClick={linkEvent(this, this.handlePostLike)}
                  aria-label={i18n.t("upvote")}
                >
                  <Icon icon="arrow-up1" classes="icon-inline small mr-2" />
                  {numToSI(this.state.upvotes)}
                </button>
              ) : (
                <button
                  className={`btn-animate btn py-0 px-1 ${
                    this.state.my_vote == 1 ? "text-info" : "text-muted"
                  }`}
                  onClick={linkEvent(this, this.handlePostLike)}
                  aria-label={i18n.t("upvote")}
                >
                  <Icon icon="arrow-up1" classes="icon-inline small" />
                </button>
              )}
              {this.props.enableDownvotes &&
                (showScores() ? (
                  <button
                    className={`ml-2 btn-animate btn py-0 pl-1 ${
                      this.state.my_vote == -1 ? "text-danger" : "text-muted"
                    }`}
                    onClick={linkEvent(this, this.handlePostDisLike)}
                    data-tippy-content={this.pointsTippy}
                    aria-label={i18n.t("downvote")}
                  >
                    <Icon icon="arrow-down1" classes="icon-inline small mr-2" />
                    {this.state.downvotes !== 0 && (
                      <span>{numToSI(this.state.downvotes)}</span>
                    )}
                  </button>
                ) : (
                  <button
                    className={`ml-2 btn-animate btn py-0 pl-1 ${
                      this.state.my_vote == -1 ? "text-danger" : "text-muted"
                    }`}
                    onClick={linkEvent(this, this.handlePostDisLike)}
                    aria-label={i18n.t("downvote")}
                  >
                    <Icon icon="arrow-down1" classes="icon-inline small" />
                  </button>
                ))}
            </div>
            <button
              className="btn btn-link btn-animate text-muted py-0 pl-1 pr-0"
              onClick={linkEvent(this, this.handleSavePostClick)}
              aria-label={post_view.saved ? i18n.t("unsave") : i18n.t("save")}
              data-tippy-content={
                post_view.saved ? i18n.t("unsave") : i18n.t("save")
              }
            >
              <Icon
                icon="star"
                classes={`icon-inline ${post_view.saved && "text-warning"}`}
              />
            </button>

            {/* <button
              class="btn btn-link btn-animate text-muted py-0 pl-1 pr-0"
              onClick={linkEvent(this, this.handleTipPostClick)}
              aria-label={post_view.saved ? i18n.t("tip2") : i18n.t("tip2")}
              data-tippy-content={
                post_view.saved ? i18n.t("tip2") : i18n.t("tip2")
              }
            >
              <Icon
                icon="heart"
                classes={`icon-inline ${post_view.saved && "text-warning"}`}
              />
            </button> */}
            {!this.state.showMoreMobile && this.showBody && (
              <button
                className="btn btn-link btn-animate text-muted py-0"
                onClick={linkEvent(this, this.handleShowMoreMobile)}
                aria-label={i18n.t("more")}
                data-tippy-content={i18n.t("more")}
              >
                <Icon icon="more-vertical" classes="icon-inline" />
              </button>
            )}
            {this.state.showMoreMobile && this.postActions(mobile)}
          </>
        )}
        {mobile && !this.props.viewOnly && this.mobileVotes}
        {UserService.Instance.myUserInfo.isSome() &&
          !this.props.viewOnly &&
          this.postActions(mobile)}
      </div>
    );
  }

  /*  
  commentsLine(mobile = false) {
    let post = this.props.post_view.post;
    return (
      <div className="d-flex justify-content-start flex-wrap text-muted font-weight-bold mb-1">
        {this.commentsButton}
        {!post.local && (
          <a
            className="btn btn-link btn-animate text-muted py-0"
            title={i18n.t("link")}
            href={post.ap_id}
          >
            <Icon icon="fedilink" inline />
          </a>
        )}
        {mobile && !this.props.viewOnly && this.mobileVotes}
        {UserService.Instance.myUserInfo.isSome() &&
          !this.props.viewOnly &&
          this.postActions(mobile)}
      </div>
    );
  }
  */
  postActions(mobile = false) {
    // Possible enhancement: Priority+ pattern instead of just hard coding which get hidden behind the show more button.
    // Possible enhancement: Make each button a component.
    let post_view = this.props.post_view;
    return (
      <>
        {this.saveButton}
        {this.crossPostButton}
        {mobile && this.showMoreButton}
        {(!mobile || this.state.showAdvanced) && (
          <>
            {!this.myPost && (
              <>
                {this.reportButton}
                {this.blockButton}
              </>
            )}
            {this.myPost && (this.showBody || this.state.showAdvanced) && (
              <>
                {this.editButton}
                {this.deleteButton}
              </>
            )}
          </>
        )}
        {this.state.showAdvanced && (
          <>
            {this.showBody &&
              post_view.post.body.isSome() &&
              this.viewSourceButton}
            {this.canModOnSelf_ && (
              <>
                {this.lockButton}
                {this.stickyButton}
              </>
            )}
            {(this.canMod_ || this.canAdmin_) && <>{this.modRemoveButton}</>}
          </>
        )}
        {!mobile && this.showMoreButton}
      </>
    );
  }

  get commentsButton() {
    let post_view = this.props.post_view;
    return (
      <button className="btn btn-link text-muted py-0 pl-0">
        <Link
          className="text-muted"
          title={i18n.t("number_of_comments", {
            count: post_view.counts.comments,
            formattedCount: post_view.counts.comments,
          })}
          to={`/post/${post_view.post.id}?scrollToComments=true`}
        >
          <Icon icon="message-square" classes="mr-1" inline />
          {i18n.t("number_of_comments", {
            count: post_view.counts.comments,
            formattedCount: numToSI(post_view.counts.comments),
          })}
        </Link>
      </button>
    );
  }

  get mobileVotes() {
    // TODO: make nicer
    let tippy = showScores() ? { "data-tippy-content": this.pointsTippy } : {};
    return (
      <>
        <div>
          <button
            className={`btn-animate btn py-0 px-1 ${
              this.state.my_vote.unwrapOr(0) == 1 ? "text-info" : "text-muted"
            }`}
            {...tippy}
            onClick={this.handlePostLike}
            aria-label={i18n.t("upvote")}
          >
            <Icon icon="arrow-up1" classes="icon-inline small" />
            {showScores() && (
              <span className="ml-2">{numToSI(this.state.upvotes)}</span>
            )}
          </button>
          {this.props.enableDownvotes && (
            <button
              className={`ml-2 btn-animate btn py-0 px-1 ${
                this.state.my_vote.unwrapOr(0) == -1
                  ? "text-danger"
                  : "text-muted"
              }`}
              onClick={this.handlePostDisLike}
              {...tippy}
              aria-label={i18n.t("downvote")}
            >
              <Icon icon="arrow-down1" classes="icon-inline small" />
              {showScores() && (
                <span
                  className={classNames("ml-2", {
                    invisible: this.state.downvotes === 0,
                  })}
                >
                  {numToSI(this.state.downvotes)}
                </span>
              )}
            </button>
          )}
        </div>
      </>
    );
  }

  get saveButton() {
    let saved = this.props.post_view.saved;
    let label = saved ? i18n.t("unsave") : i18n.t("save");
    return (
      <button
        className="btn btn-link btn-animate text-muted py-0"
        onClick={linkEvent(this, this.handleSavePostClick)}
        data-tippy-content={label}
        aria-label={label}
      >
        <Icon
          icon="star"
          classes={classNames({ "text-warning": saved })}
          inline
        />
      </button>
    );
  }

  get crossPostButton() {
    return (
      <Link
        className="btn btn-link btn-animate text-muted py-0"
        to={`/create_post${this.crossPostParams}`}
        title={i18n.t("cross_post")}
      >
        <Icon icon="copy" inline />
      </Link>
    );
  }

  get reportButton() {
    return (
      <button
        className="btn btn-link btn-animate text-muted py-0"
        onClick={linkEvent(this, this.handleShowReportDialog)}
        data-tippy-content={i18n.t("show_report_dialog")}
        aria-label={i18n.t("show_report_dialog")}
      >
        <Icon icon="flag" inline />
      </button>
    );
  }

  get blockButton() {
    return (
      <button
        className="btn btn-link btn-animate text-muted py-0"
        onClick={linkEvent(this, this.handleBlockUserClick)}
        data-tippy-content={i18n.t("block_user")}
        aria-label={i18n.t("block_user")}
      >
        <Icon icon="slash" inline />
      </button>
    );
  }

  get editButton() {
    return (
      <button
        className="btn btn-link btn-animate text-muted py-0"
        onClick={linkEvent(this, this.handleEditClick)}
        data-tippy-content={i18n.t("edit")}
        aria-label={i18n.t("edit")}
      >
        <Icon icon="edit" inline />
      </button>
    );
  }

  get deleteButton() {
    let deleted = this.props.post_view.post.deleted;
    let label = !deleted ? i18n.t("delete") : i18n.t("restore");
    return (
      <button
        className="btn btn-link btn-animate text-muted py-0"
        onClick={linkEvent(this, this.handleDeleteClick)}
        data-tippy-content={label}
        aria-label={label}
      >
        <Icon
          icon="trash"
          classes={classNames({ "text-danger": deleted })}
          inline
        />
      </button>
    );
  }

  get showMoreButton() {
    return (
      <button
        className="btn btn-link btn-animate text-muted py-0"
        onClick={linkEvent(this, this.handleShowAdvanced)}
        data-tippy-content={i18n.t("more")}
        aria-label={i18n.t("more")}
      >
        <Icon icon="more-vertical" inline />
      </button>
    );
  }

  get viewSourceButton() {
    return (
      <button
        className="btn btn-link btn-animate text-muted py-0"
        onClick={linkEvent(this, this.handleViewSource)}
        data-tippy-content={i18n.t("view_source")}
        aria-label={i18n.t("view_source")}
      >
        <Icon
          icon="file-text"
          classes={classNames({ "text-success": this.state.viewSource })}
          inline
        />
      </button>
    );
  }

  get lockButton() {
    let locked = this.props.post_view.post.locked;
    let label = locked ? i18n.t("unlock") : i18n.t("lock");
    return (
      <button
        className="btn btn-link btn-animate text-muted py-0"
        onClick={linkEvent(this, this.handleModLock)}
        data-tippy-content={label}
        aria-label={label}
      >
        <Icon
          icon="lock"
          classes={classNames({ "text-danger": locked })}
          inline
        />
      </button>
    );
  }

  get stickyButton() {
    let stickied = this.props.post_view.post.stickied;
    let label = stickied ? i18n.t("unsticky") : i18n.t("sticky");
    return (
      <button
        className="btn btn-link btn-animate text-muted py-0"
        onClick={linkEvent(this, this.handleModSticky)}
        data-tippy-content={label}
        aria-label={label}
      >
        <Icon
          icon="pin"
          classes={classNames({ "text-success": stickied })}
          inline
        />
      </button>
    );
  }

  get modRemoveButton() {
    let removed = this.props.post_view.post.removed;
    return (
      <button
        className="btn btn-link btn-animate text-muted py-0"
        onClick={linkEvent(
          this,
          !removed ? this.handleModRemoveShow : this.handleModRemoveSubmit
        )}
      >
        {/* TODO: Find an icon for this. */}
        {!removed ? i18n.t("remove") : i18n.t("restore")}
      </button>
    );
  }

  /**
   * Mod/Admin actions to be taken against the author.
   */
  userActionsLine() {
    // TODO: make nicer
    let post_view = this.props.post_view;
    return (
      this.state.showAdvanced && (
        <>
          {this.canMod_ && (
            <>
              {!this.creatorIsMod_ &&
                (!post_view.creator_banned_from_community ? (
                  <button
                    className="btn btn-link btn-animate text-muted py-0"
                    onClick={linkEvent(
                      this,
                      this.handleModBanFromCommunityShow
                    )}
                    aria-label={i18n.t("ban")}
                  >
                    {i18n.t("ban")}
                  </button>
                ) : (
                  <button
                    className="btn btn-link btn-animate text-muted py-0"
                    onClick={linkEvent(
                      this,
                      this.handleModBanFromCommunitySubmit
                    )}
                    aria-label={i18n.t("unban")}
                  >
                    {i18n.t("unban")}
                  </button>
                ))}
              {!post_view.creator_banned_from_community && (
                <button
                  className="btn btn-link btn-animate text-muted py-0"
                  onClick={linkEvent(this, this.handleAddModToCommunity)}
                  aria-label={
                    this.creatorIsMod_
                      ? i18n.t("remove_as_mod")
                      : i18n.t("appoint_as_mod")
                  }
                >
                  {this.creatorIsMod_
                    ? i18n.t("remove_as_mod")
                    : i18n.t("appoint_as_mod")}
                </button>
              )}
            </>
          )}
          {/* Community creators and admins can transfer community to another mod */}
          {(amCommunityCreator(this.props.moderators, post_view.creator.id) ||
            this.canAdmin_) &&
            this.creatorIsMod_ &&
            (!this.state.showConfirmTransferCommunity ? (
              <button
                className="btn btn-link btn-animate text-muted py-0"
                onClick={linkEvent(
                  this,
                  this.handleShowConfirmTransferCommunity
                )}
                aria-label={i18n.t("transfer_community")}
              >
                {i18n.t("transfer_community")}
              </button>
            ) : (
              <>
                <button
                  className="d-inline-block mr-1 btn btn-link btn-animate text-muted py-0"
                  aria-label={i18n.t("are_you_sure")}
                >
                  {i18n.t("are_you_sure")}
                </button>
                <button
                  className="btn btn-link btn-animate text-muted py-0 d-inline-block mr-1"
                  aria-label={i18n.t("yes")}
                  onClick={linkEvent(this, this.handleTransferCommunity)}
                >
                  {i18n.t("yes")}
                </button>
                <button
                  className="btn btn-link btn-animate text-muted py-0 d-inline-block"
                  onClick={linkEvent(
                    this,
                    this.handleCancelShowConfirmTransferCommunity
                  )}
                  aria-label={i18n.t("no")}
                >
                  {i18n.t("no")}
                </button>
              </>
            ))}
          {/* Admins can ban from all, and appoint other admins */}
          {this.canAdmin_ && (
            <>
              {!this.creatorIsAdmin_ && (
                <>
                  {!isBanned(post_view.creator) ? (
                    <button
                      className="btn btn-link btn-animate text-muted py-0"
                      onClick={linkEvent(this, this.handleModBanShow)}
                      aria-label={i18n.t("ban_from_site")}
                    >
                      {i18n.t("ban_from_site")}
                    </button>
                  ) : (
                    <button
                      className="btn btn-link btn-animate text-muted py-0"
                      onClick={linkEvent(this, this.handleModBanSubmit)}
                      aria-label={i18n.t("unban_from_site")}
                    >
                      {i18n.t("unban_from_site")}
                    </button>
                  )}
                  <button
                    className="btn btn-link btn-animate text-muted py-0"
                    onClick={linkEvent(this, this.handlePurgePersonShow)}
                    aria-label={i18n.t("purge_user")}
                  >
                    {i18n.t("purge_user")}
                  </button>
                  <button
                    className="btn btn-link btn-animate text-muted py-0"
                    onClick={linkEvent(this, this.handlePurgePostShow)}
                    aria-label={i18n.t("purge_post")}
                  >
                    {i18n.t("purge_post")}
                  </button>
                </>
              )}
              {!isBanned(post_view.creator) && post_view.creator.local && (
                <button
                  className="btn btn-link btn-animate text-muted py-0"
                  onClick={linkEvent(this, this.handleAddAdmin)}
                  aria-label={
                    this.creatorIsAdmin_
                      ? i18n.t("remove_as_admin")
                      : i18n.t("appoint_as_admin")
                  }
                >
                  {this.creatorIsAdmin_
                    ? i18n.t("remove_as_admin")
                    : i18n.t("appoint_as_admin")}
                </button>
              )}
            </>
          )}
        </>
      )
    );
  }

  removeAndBanDialogs() {
    let post = this.props.post_view;
    let purgeTypeText: string;
    if (this.state.purgeType == PurgeType.Post) {
      purgeTypeText = i18n.t("purge_post");
    } else if (this.state.purgeType == PurgeType.Person) {
      purgeTypeText = `${i18n.t("purge")} ${post.creator.name}`;
    }
    return (
      <>
        {this.state.showRemoveDialog && (
          <form
            className="form-inline"
            onSubmit={linkEvent(this, this.handleModRemoveSubmit)}
          >
            <label className="sr-only" htmlFor="post-listing-remove-reason">
              {i18n.t("reason")}
            </label>
            <input
              type="text"
              id="post-listing-remove-reason"
              className="form-control mr-2"
              placeholder={i18n.t("reason")}
              value={toUndefined(this.state.removeReason)}
              onInput={linkEvent(this, this.handleModRemoveReasonChange)}
            />
            <button
              type="submit"
              className="btn btn-secondary"
              aria-label={i18n.t("remove_post")}
            >
              {i18n.t("remove_post")}
            </button>
          </form>
        )}
        {this.state.showBanDialog && (
          <form onSubmit={linkEvent(this, this.handleModBanBothSubmit)}>
            <div className="form-group row col-12">
              <label
                className="col-form-label"
                htmlFor="post-listing-ban-reason"
              >
                {i18n.t("reason")}
              </label>
              <input
                type="text"
                id="post-listing-ban-reason"
                className="form-control mr-2"
                placeholder={i18n.t("reason")}
                value={toUndefined(this.state.banReason)}
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
                value={toUndefined(this.state.banExpireDays)}
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
                type="submit"
                className="btn btn-secondary"
                aria-label={i18n.t("ban")}
              >
                {i18n.t("ban")} {post.creator.name}
              </button>
            </div>
          </form>
        )}
        {this.state.showReportDialog && (
          <form
            className="form-inline"
            onSubmit={linkEvent(this, this.handleReportSubmit)}
          >
            <label className="sr-only" htmlFor="post-report-reason">
              {i18n.t("reason")}
            </label>
            <input
              type="text"
              id="post-report-reason"
              className="form-control mr-2"
              placeholder={i18n.t("reason")}
              required
              value={toUndefined(this.state.reportReason)}
              onInput={linkEvent(this, this.handleReportReasonChange)}
            />
            <button
              type="submit"
              className="btn btn-secondary"
              aria-label={i18n.t("create_report")}
            >
              {i18n.t("create_report")}
            </button>
          </form>
        )}
        {this.state.showPurgeDialog && (
          <form
            className="form-inline"
            onSubmit={linkEvent(this, this.handlePurgeSubmit)}
          >
            <PurgeWarning />
            <label className="sr-only" htmlFor="purge-reason">
              {i18n.t("reason")}
            </label>
            <input
              type="text"
              id="purge-reason"
              className="form-control mr-2"
              placeholder={i18n.t("reason")}
              value={toUndefined(this.state.purgeReason)}
              onInput={linkEvent(this, this.handlePurgeReasonChange)}
            />
            {this.state.purgeLoading ? (
              <Spinner />
            ) : (
              <button
                type="submit"
                className="btn btn-secondary"
                aria-label={purgeTypeText}
              >
                {purgeTypeText}
              </button>
            )}
          </form>
        )}
      </>
    );
  }

  mobileThumbnail() {
    let post = this.props.post_view.post;
    return post.thumbnail_url.isSome() ||
      post.url.map(isImage).unwrapOr(false) ? (
      <div className="row">
        <div className={`${this.state.imageExpanded ? "col-12" : "col-8"}`}>
          {this.postTitleLine()}
        </div>
        <div className="col-4">
          {/* Post body prev or thumbnail */}
          {!this.state.imageExpanded && this.thumbnail()}
        </div>
      </div>
    ) : (
      this.postTitleLine()
    );
  }

  showMobilePreview() {
    let post = this.props.post_view.post;
    return (
      !this.showBody &&
      post.body.match({
        some: body => <div className="md-div mb-1 preview-lines">{body}</div>,
        none: <></>,
      })
    );
  }

  listing() {
    return (
      <>
        {/* The mobile view*/}
        <div className="d-block d-sm-none">
          <div className="row">
            <div className="col-12">
              {this.createdLine()}

              {/* If it has a thumbnail, do a right aligned thumbnail */}
              {this.mobileThumbnail()}

              {/* Show a preview of the post body */}
              {this.showMobilePreview()}

              {this.commentsLine(true)}
              {this.userActionsLine()}
              {this.duplicatesLine()}
              {this.removeAndBanDialogs()}
            </div>
          </div>
        </div>

        {/* The larger view*/}
        <div className="d-none d-sm-block">
          <div className="row">
            {!this.props.viewOnly && this.voteBar()}
            <div className="col-sm-2 pr-0">
              <div className="">{this.thumbnail()}</div>
            </div>
            <div className="col-12 col-sm-9">
              <div className="row">
                <div className="col-12">
                  {this.postTitleLine()}
                  {this.createdLine()}
                  {this.commentsLine()}
                  {this.duplicatesLine()}
                  {this.userActionsLine()}
                  {this.removeAndBanDialogs()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  get isPiBrowser(): boolean {
    return isBrowser() && navigator.userAgent.includes("PiBrowser");
  }

  private get myPost(): boolean {
    return UserService.Instance.myUserInfo.match({
      some: mui =>
        this.props.post_view.creator.id == mui.local_user_view.person.id,
      none: false,
    });
  }

  handlePostLike(event: any) {
    event.preventDefault();
    if (UserService.Instance.myUserInfo.isNone()) {
      this.context.router.history.push(`/login`);
    }

    let myVote = this.state.my_vote.unwrapOr(0);
    let newVote = myVote == 1 ? 0 : 1;

    if (myVote == 1) {
      this.setState({
        score: this.state.score - 1,
        upvotes: this.state.upvotes - 1,
      });
    } else if (myVote == -1) {
      this.setState({
        score: this.state.score + 2,
        upvotes: this.state.upvotes + 1,
        downvotes: this.state.downvotes - 1,
      });
    } else {
      this.setState({
        score: this.state.score + 1,
        upvotes: this.state.upvotes + 1,
      });
    }

    this.setState({ my_vote: Some(newVote) });

    let form = new CreatePostLike({
      post_id: this.props.post_view.post.id,
      score: newVote,
      auth: auth().unwrap(),
    });

    WebSocketService.Instance.send(wsClient.likePost(form));
    this.setState(this.state);
    setupTippy();
  }

  handlePostDisLike(event: any) {
    event.preventDefault();
    if (UserService.Instance.myUserInfo.isNone()) {
      this.context.router.history.push(`/login`);
    }

    let myVote = this.state.my_vote.unwrapOr(0);
    let newVote = myVote == -1 ? 0 : -1;

    if (myVote == 1) {
      this.setState({
        score: this.state.score - 2,
        upvotes: this.state.upvotes - 1,
        downvotes: this.state.downvotes + 1,
      });
    } else if (myVote == -1) {
      this.setState({
        score: this.state.score + 1,
        downvotes: this.state.downvotes - 1,
      });
    } else {
      this.setState({
        score: this.state.score - 1,
        downvotes: this.state.downvotes + 1,
      });
    }

    this.setState({ my_vote: Some(newVote) });

    let form = new CreatePostLike({
      post_id: this.props.post_view.post.id,
      score: newVote,
      auth: auth().unwrap(),
    });

    WebSocketService.Instance.send(wsClient.likePost(form));
    this.setState(this.state);
    setupTippy();
  }

  handleEditClick(i: PostListing) {
    i.setState({ showEdit: true });
  }

  handleEditCancel() {
    this.setState({ showEdit: false });
  }

  // The actual editing is done in the recieve for post
  handleEditPost() {
    this.setState({ showEdit: false });
  }

  handleShowReportDialog(i: PostListing) {
    i.setState({ showReportDialog: !i.state.showReportDialog });
  }

  handleReportReasonChange(i: PostListing, event: any) {
    i.setState({ reportReason: Some(event.target.value) });
  }

  handleReportSubmit(i: PostListing, event: any) {
    event.preventDefault();
    let form = new CreatePostReport({
      post_id: i.props.post_view.post.id,
      reason: toUndefined(i.state.reportReason),
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(wsClient.createPostReport(form));

    i.setState({ showReportDialog: false });
  }

  handleBlockUserClick(i: PostListing) {
    let blockUserForm = new BlockPerson({
      person_id: i.props.post_view.creator.id,
      block: true,
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(wsClient.blockPerson(blockUserForm));
  }

  handleDeleteClick(i: PostListing) {
    let deleteForm = new DeletePost({
      post_id: i.props.post_view.post.id,
      deleted: !i.props.post_view.post.deleted,
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(wsClient.deletePost(deleteForm));
  }

  handleSavePostClick(i: PostListing) {
    let saved =
      i.props.post_view.saved == undefined ? true : !i.props.post_view.saved;
    let form = new SavePost({
      post_id: i.props.post_view.post.id,
      save: saved,
      auth: auth().unwrap(),
    });

    WebSocketService.Instance.send(wsClient.savePost(form));
  }

  async handleBlockchainClick(i: PostListing) {
    if (this.isPiBrowser) return;
    const isMetaMaskInstalled = () => {
      //Have to check the ethereum binding on the window object to see if it's installed
      const { ethereum } = window;
      return Boolean(ethereum && ethereum.isMetaMask);
    };

    var config = {
      memo: "wepi:post",
      metadata: {
        id: i.props.post_view.post.id,
        own: i.props.post_view.creator.id,
        cid: i.props.post_view.community.id,
        url: i.props.post_view.post.url,
        name: i.props.post_view.post.name,
        body: i.props.post_view.post.body,
        ap_id: i.props.post_view.post.ap_id,
        t: i.props.post_view.post.published,
        u: i.props.post_view.post.updated,
        et: i.props.post_view.post.embed_title,
        ed: i.props.post_view.post.embed_description,
        eb: i.props.post_view.post.embed_html,
        sign: i.props.post_view.post.cert,
      },
    };
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

  async handleTipPostClick(i: PostListing) {
    if (!i.props.post_view.creator.web3_address) return;
    if (this.isPiBrowser) return;
    const isMetaMaskInstalled = () => {
      //Have to check the ethereum binding on the window object to see if it's installed
      const { ethereum } = window;
      return Boolean(ethereum && ethereum.isMetaMask);
    };

    var config = {
      memo: "wepi:tip:" + i.props.post_view.creator.name,
      metadata: {
        id: i.props.post_view.creator.id,
        post_id: i.props.post_view.post.id,
        //post_name: i.props.post_view.post.name,
        t: i.props.post_view.post.published,
        u: i.props.post_view.post.updated,
      },
    };
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
                to: i.props.post_view.creator.web3_address || web3TipAddress,
                gasPrice: gasPrice,
                value: eth01,
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

  async handlePiTipClick(i: PostListing) {
    var piUser;
    var config = {
      amount: 0.1,
      memo: "wepi:tip:post",
      metadata: {
        id: i.props.post_view.creator.id,
        //cid: i.props.post_view.community.id,
        post_id: i.props.post_view.post.id,
        address: i.props.post_view.creator.pi_address,
        t: i.props.post_view.post.published,
        u: i.props.post_view.post.updated,
      },
    };
    var info = {
      own: i.props.post_view.creator.id,
      comment:
        "tip post;" +
        i.props.post_view.creator.name +
        ";" +
        i.props.post_view.post.id,
    };
    const authenticatePiUser = async () => {
      // Identify the user with their username / unique network-wide ID, and get permission to request payments from them.
      const scopes = ["username", "payments"];
      try {
        /// HOW TO CALL Pi.authenticate Global/Init
        var user = await window.Pi.authenticate(
          scopes,
          onIncompletePaymentFound
        );
        return user;
      } catch (err) {
        alert("Pi.authenticate error:" + JSON.stringify(err));
        console.log(err);
      }
    };
    const onIncompletePaymentFound = async payment => {
      const { data } = await axios.post("/pi/found", {
        paymentid: payment.identifier,
        pi_username: piUser.user.username,
        pi_uid: piUser.user.uid,
        person_id: null,
        comment: null,
        auth: null,
        dto: null,
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
        onReadyForServerApproval: payment_id =>
          onReadyForApproval(payment_id, info, config),
        onReadyForServerCompletion: (payment_id, txid) =>
          onReadyForCompletion(payment_id, txid, info, config),
        onCancel: onCancel,
        onError: onError,
      });
    };

    const onReadyForApproval = async (payment_id, info, paymentConfig) => {
      //make POST request to your app server /payments/approve endpoint with paymentId in the body
      const { data } = await axios.post("/pi/approve", {
        paymentid: payment_id,
        pi_username: piUser.user.username,
        pi_uid: piUser.user.uid,
        person_id: info.own,
        comment: info.comment,
        //paymentConfig
      });
      if (data.status >= 200 && data.status < 300) {
        //payment was approved continue with flow
        return data;
      } else {
        //alert("Payment approve error: " + JSON.stringify(data));
      }
    };

    // Update or change password
    const onReadyForCompletion = (payment_id, txid, info, paymentConfig) => {
      //make POST request to your app server /payments/complete endpoint with paymentId and txid in the body
      axios
        .post("/pi/complete", {
          paymentid: payment_id,
          pi_username: piUser.user.username,
          pi_uid: piUser.user.uid,
          person_id: info.own,
          comment: info.comment,
          txid,
          //paymentConfig,
        })
        .then(data => {
          //alert("Payment complete error: " + JSON.stringify(data));

          if (data.status >= 200 && data.status < 300) {
            return true;
          } else {
            alert("Payment complete error: " + JSON.stringify(data));
          }
          return false;
        });
      return false;
    };

    const onCancel = paymentId => {
      console.log("Payment cancelled: ", paymentId);
    };
    const onError = (error, paymentId) => {
      console.log("Payment error: ", error, paymentId);
    };

    try {
      piUser = await authenticatePiUser();
      await createPiPayment(info, config);
    } catch (err) {
      alert("PiPayment error:" + JSON.stringify(err));
    }
  }

  async handlePiBlockchainClick(i: PostListing) {
    var config = {
      amount: 0.001,
      memo: "wepi:post",
      metadata: {
        id: i.props.post_view.post.id,
        own: i.props.post_view.creator.id,
        cid: i.props.post_view.community.id,
        url: i.props.post_view.post.url,
        name: i.props.post_view.post.name,
        body: i.props.post_view.post.body,
        ap_id: i.props.post_view.post.ap_id,
        t: i.props.post_view.post.published,
        u: i.props.post_view.post.updated,
        et: i.props.post_view.post.embed_title,
        ed: i.props.post_view.post.embed_description,
        eb: i.props.post_view.post.embed_html,
        sign: i.props.post_view.post.cert,
      },
    };
    var info = {
      own: i.props.post_view.creator.id,
      comment: i.props.post_view.post.id,
    };
    var piUser;

    const authenticatePiUser = async () => {
      // Identify the user with their username / unique network-wide ID, and get permission to request payments from them.
      const scopes = ["username", "payments"];
      try {
        /// HOW TO CALL Pi.authenticate Global/Init
        var user = await window.Pi.authenticate(
          scopes,
          onIncompletePaymentFound
        );
        return user;
      } catch (err) {
        alert("Pi.authenticate error:" + JSON.stringify(err));
        console.log(err);
      }
    };
    const onIncompletePaymentFound = async payment => {
      const { data } = await axios.post("/pi/found", {
        paymentid: payment.identifier,
        pi_username: piUser.user.username,
        pi_uid: piUser.user.uid,
        person_id:
          payment.metadata.own !== undefined ? payment.metadata.own : null,
        comment:
          payment.metadata.comment !== undefined
            ? payment.metadata.comment
            : null,
        auth: null,
        dto: null,
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
        onReadyForServerApproval: payment_id =>
          onReadyForApproval(payment_id, info, config),
        onReadyForServerCompletion: (payment_id, txid) =>
          onReadyForCompletion(payment_id, txid, info, config),
        onCancel: onCancel,
        onError: onError,
      });
    };

    const onReadyForApproval = async (payment_id, info, paymentConfig) => {
      //make POST request to your app server /payments/approve endpoint with paymentId in the body
      const { data } = await axios.post("/pi/approve", {
        paymentid: payment_id,
        pi_username: piUser.user.username,
        pi_uid: piUser.user.uid,
        person_id: info.own,
        comment: info.comment,
        paymentConfig,
      });
      if (data.status >= 200 && data.status < 300) {
        //payment was approved continue with flow
        return data;
      } else {
        //alert("Payment approve error: " + JSON.stringify(data));
      }
    };

    // Update or change password
    const onReadyForCompletion = (payment_id, txid, info, paymentConfig) => {
      //make POST request to your app server /payments/complete endpoint with paymentId and txid in the body
      axios
        .post("/pi/complete", {
          paymentid: payment_id,
          pi_username: piUser.user.username,
          pi_uid: piUser.user.uid,
          person_id: info.own,
          comment: info.comment,
          txid,
          paymentConfig,
        })
        .then(data => {
          //alert("Completing payment data: " + JSON.stringify(data));

          if (data.status >= 200 && data.status < 300) {
            return true;
          } else {
            alert("Completing payment error: " + JSON.stringify(data));
          }
          return false;
        });
      return false;
    };

    const onCancel = paymentId => {
      console.log("Payment cancelled: ", paymentId);
    };
    const onError = (error, paymentId) => {
      console.log("Payment error: ", error, paymentId);
    };

    try {
      piUser = await authenticatePiUser();

      await createPiPayment(info, config);
    } catch (err) {
      alert("PiPayment error:" + JSON.stringify(err));
    }
  }

  async handleLinkBlockchainClick(i: PostListing) {
    var url = i.props.post_view.post.tx;
    window.open(url, "_blank");
  }

  get crossPostParams(): string {
    let post = this.props.post_view.post;
    let params = `?title=${encodeURIComponent(post.name)}`;

    if (post.url.isSome()) {
      params += `&url=${encodeURIComponent(post.url.unwrap())}`;
    }
    if (post.body.isSome()) {
      params += `&body=${encodeURIComponent(this.crossPostBody())}`;
    }
    return params;
  }

  crossPostBody(): string {
    let post = this.props.post_view.post;
    let body = `${i18n.t("cross_posted_from")} ${post.ap_id}\n\n${post.body
      .unwrap()
      .replace(/^/gm, "> ")}`;
    return body;
  }

  get showBody(): boolean {
    return this.props.showBody || this.state.showBody;
  }

  handleModRemoveShow(i: PostListing) {
    i.setState({
      showRemoveDialog: !i.state.showRemoveDialog,
      showBanDialog: false,
    });
  }

  handleModRemoveReasonChange(i: PostListing, event: any) {
    i.setState({ removeReason: Some(event.target.value) });
  }

  handleModRemoveDataChange(i: PostListing, event: any) {
    i.setState({ removeData: event.target.checked });
  }

  handleModRemoveSubmit(i: PostListing, event: any) {
    event.preventDefault();
    let form = new RemovePost({
      post_id: i.props.post_view.post.id,
      removed: !i.props.post_view.post.removed,
      reason: i.state.removeReason,
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(wsClient.removePost(form));

    i.setState({ showRemoveDialog: false });
  }

  handleModLock(i: PostListing) {
    let form = new LockPost({
      post_id: i.props.post_view.post.id,
      locked: !i.props.post_view.post.locked,
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(wsClient.lockPost(form));
  }

  handleModSticky(i: PostListing) {
    let form = new StickyPost({
      post_id: i.props.post_view.post.id,
      stickied: !i.props.post_view.post.stickied,
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(wsClient.stickyPost(form));
  }

  handleModBanFromCommunityShow(i: PostListing) {
    i.setState({
      showBanDialog: true,
      banType: BanType.Community,
      showRemoveDialog: false,
    });
  }

  handleModBanShow(i: PostListing) {
    i.setState({
      showBanDialog: true,
      banType: BanType.Site,
      showRemoveDialog: false,
    });
  }

  handlePurgePersonShow(i: PostListing) {
    i.setState({
      showPurgeDialog: true,
      purgeType: PurgeType.Person,
      showRemoveDialog: false,
    });
  }

  handlePurgePostShow(i: PostListing) {
    i.setState({
      showPurgeDialog: true,
      purgeType: PurgeType.Post,
      showRemoveDialog: false,
    });
  }

  handlePurgeReasonChange(i: PostListing, event: any) {
    i.setState({ purgeReason: Some(event.target.value) });
  }

  handlePurgeSubmit(i: PostListing, event: any) {
    event.preventDefault();

    if (i.state.purgeType == PurgeType.Person) {
      let form = new PurgePerson({
        person_id: i.props.post_view.creator.id,
        reason: i.state.purgeReason,
        auth: auth().unwrap(),
      });
      WebSocketService.Instance.send(wsClient.purgePerson(form));
    } else if (i.state.purgeType == PurgeType.Post) {
      let form = new PurgePost({
        post_id: i.props.post_view.post.id,
        reason: i.state.purgeReason,
        auth: auth().unwrap(),
      });
      WebSocketService.Instance.send(wsClient.purgePost(form));
    }

    i.setState({ purgeLoading: true });
  }

  handleModBanReasonChange(i: PostListing, event: any) {
    i.setState({ banReason: Some(event.target.value) });
  }

  handleModBanExpireDaysChange(i: PostListing, event: any) {
    i.setState({ banExpireDays: Some(event.target.value) });
  }

  handleModBanFromCommunitySubmit(i: PostListing) {
    i.setState({ banType: BanType.Community });
    i.handleModBanBothSubmit(i);
  }

  handleModBanSubmit(i: PostListing) {
    i.setState({ banType: BanType.Site });
    i.handleModBanBothSubmit(i);
  }

  handleModBanBothSubmit(i: PostListing, event?: any) {
    if (event) event.preventDefault();

    if (i.state.banType == BanType.Community) {
      // If its an unban, restore all their data
      let ban = !i.props.post_view.creator_banned_from_community;
      if (ban == false) {
        i.setState({ removeData: false });
      }
      let form = new BanFromCommunity({
        person_id: i.props.post_view.creator.id,
        community_id: i.props.post_view.community.id,
        ban,
        remove_data: Some(i.state.removeData),
        reason: i.state.banReason,
        expires: i.state.banExpireDays.map(futureDaysToUnixTime),
        auth: auth().unwrap(),
      });
      WebSocketService.Instance.send(wsClient.banFromCommunity(form));
    } else {
      // If its an unban, restore all their data
      let ban = !i.props.post_view.creator.banned;
      if (ban == false) {
        i.setState({ removeData: false });
      }
      let form = new BanPerson({
        person_id: i.props.post_view.creator.id,
        ban,
        remove_data: Some(i.state.removeData),
        reason: i.state.banReason,
        expires: i.state.banExpireDays.map(futureDaysToUnixTime),
        auth: auth().unwrap(),
      });
      WebSocketService.Instance.send(wsClient.banPerson(form));
    }

    i.setState({ showBanDialog: false });
  }

  handleAddModToCommunity(i: PostListing) {
    let form = new AddModToCommunity({
      person_id: i.props.post_view.creator.id,
      community_id: i.props.post_view.community.id,
      added: !i.creatorIsMod_,
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(wsClient.addModToCommunity(form));
    i.setState(i.state);
  }

  handleAddAdmin(i: PostListing) {
    let form = new AddAdmin({
      person_id: i.props.post_view.creator.id,
      added: !i.creatorIsAdmin_,
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(wsClient.addAdmin(form));
    i.setState(i.state);
  }

  handleShowConfirmTransferCommunity(i: PostListing) {
    i.setState({ showConfirmTransferCommunity: true });
  }

  handleCancelShowConfirmTransferCommunity(i: PostListing) {
    i.setState({ showConfirmTransferCommunity: false });
  }

  handleTransferCommunity(i: PostListing) {
    let form = new TransferCommunity({
      community_id: i.props.post_view.community.id,
      person_id: i.props.post_view.creator.id,
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(wsClient.transferCommunity(form));
    i.setState({ showConfirmTransferCommunity: false });
  }

  handleShowConfirmTransferSite(i: PostListing) {
    i.setState({ showConfirmTransferSite: true });
  }

  handleCancelShowConfirmTransferSite(i: PostListing) {
    i.setState({ showConfirmTransferSite: false });
  }

  handleImageExpandClick(i: PostListing, event: any) {
    event.preventDefault();
    i.setState({ imageExpanded: !i.state.imageExpanded });
    setupTippy();
  }

  handleViewSource(i: PostListing) {
    i.setState({ viewSource: !i.state.viewSource });
  }

  handleShowAdvanced(i: PostListing) {
    i.setState({ showAdvanced: !i.state.showAdvanced });
    setupTippy();
  }

  handleShowMoreMobile(i: PostListing) {
    i.setState({
      showMoreMobile: !i.state.showMoreMobile,
      showAdvanced: !i.state.showAdvanced,
    });
    setupTippy();
  }

  handleShowBody(i: PostListing) {
    i.setState({ showBody: !i.state.showBody });
    setupTippy();
  }

  get pointsTippy(): string {
    let points = i18n.t("number_of_points", {
      count: this.state.score,
      formattedCount: this.state.score,
    });

    let upvotes = i18n.t("number_of_upvotes", {
      count: this.state.upvotes,
      formattedCount: this.state.upvotes,
    });

    let downvotes = i18n.t("number_of_downvotes", {
      count: this.state.downvotes,
      formattedCount: this.state.downvotes,
    });

    return `${points} • ${upvotes} • ${downvotes}`;
  }

  get canModOnSelf_(): boolean {
    return canMod(
      this.props.moderators,
      this.props.admins,
      this.props.post_view.creator.id,
      undefined,
      true
    );
  }

  get canMod_(): boolean {
    return canMod(
      this.props.moderators,
      this.props.admins,
      this.props.post_view.creator.id
    );
  }

  get canAdmin_(): boolean {
    return canAdmin(this.props.admins, this.props.post_view.creator.id);
  }

  get creatorIsMod_(): boolean {
    return isMod(this.props.moderators, this.props.post_view.creator.id);
  }

  get creatorIsAdmin_(): boolean {
    return isAdmin(this.props.admins, this.props.post_view.creator.id);
  }
}
