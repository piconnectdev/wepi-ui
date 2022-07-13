import { Left, None, Option, Some } from "@sniptt/monads";
import classNames from "classnames";
import { Component, linkEvent } from "inferno";
import { Link } from "inferno-router";
import {
  AddAdmin,
  AddModToCommunity,
  BanFromCommunity,
  BanPerson,
  BlockPerson,
  CommentView,
  CommunityModeratorView,
  CreateCommentLike,
  CreateCommentReport,
  DeleteComment,
  MarkCommentAsRead,
  MarkPersonMentionAsRead,
  PersonMentionView,
  PersonViewSafe,
  PurgeComment,
  PurgePerson,
  RemoveComment,
  SaveComment,
  toUndefined,
  TransferCommunity,
} from "lemmy-js-client";
import moment from "moment";
import axios from "../../axios";
import { i18n } from "../../i18next";
import {
  BanType,
  CommentNode as CommentNodeI,
  PurgeType,
} from "../../interfaces";
import { UserService, WebSocketService } from "../../services";
import {
  amCommunityCreator,
  auth,
  canAdmin,
  canMod,
  colorList,
  eth001,
  eth01,
  futureDaysToUnixTime,
  gasPrice,
  isAdmin,
  isBanned,
  // auth,
  // canMod,
  // colorList,
  // getUnixTime,
  // isMod,
  // mdToHtml,
  // numToSI,
  // setupTippy,
  // showScores,
  // wsClient,
  isBrowser,
  isMod,
  mdToHtml,
  numToSI,
  setupTippy,
  showScores,
  utf8ToHex,
  web3AnchorAddress,
  web3TipAddress,
  wsClient,
} from "../../utils";
import { Icon, PurgeWarning, Spinner } from "../common/icon";
import { MomentTime } from "../common/moment-time";
import { CommunityLink } from "../community/community-link";
import { PersonListing } from "../person/person-listing";
import { CommentForm } from "./comment-form";
import { CommentNodes } from "./comment-nodes";

interface CommentNodeState {
  showReply: boolean;
  showEdit: boolean;
  showRemoveDialog: boolean;
  removeReason: Option<string>;
  showBanDialog: boolean;
  removeData: boolean;
  banReason: Option<string>;
  banExpireDays: Option<number>;
  banType: BanType;
  showPurgeDialog: boolean;
  purgeReason: Option<string>;
  purgeType: PurgeType;
  purgeLoading: boolean;
  showConfirmTransferSite: boolean;
  showConfirmTransferCommunity: boolean;
  showConfirmAppointAsMod: boolean;
  showConfirmAppointAsAdmin: boolean;
  collapsed: boolean;
  viewSource: boolean;
  showAdvanced: boolean;
  showReportDialog: boolean;
  reportReason: string;
  my_vote: Option<number>;
  score: number;
  upvotes: number;
  downvotes: number;
  borderColor: string;
  readLoading: boolean;
  saveLoading: boolean;
}

interface CommentNodeProps {
  node: CommentNodeI;
  moderators: Option<CommunityModeratorView[]>;
  admins: Option<PersonViewSafe[]>;
  noBorder?: boolean;
  noIndent?: boolean;
  viewOnly?: boolean;
  locked?: boolean;
  markable?: boolean;
  showContext?: boolean;
  showCommunity?: boolean;
  enableDownvotes: boolean;
}

export class CommentNode extends Component<CommentNodeProps, CommentNodeState> {
  private emptyState: CommentNodeState = {
    showReply: false,
    showEdit: false,
    showRemoveDialog: false,
    removeReason: None,
    showBanDialog: false,
    removeData: false,
    banReason: None,
    banExpireDays: None,
    banType: BanType.Community,
    showPurgeDialog: false,
    purgeLoading: false,
    purgeReason: None,
    purgeType: PurgeType.Person,
    collapsed: false,
    viewSource: false,
    showAdvanced: false,
    showConfirmTransferSite: false,
    showConfirmTransferCommunity: false,
    showConfirmAppointAsMod: false,
    showConfirmAppointAsAdmin: false,
    showReportDialog: false,
    reportReason: null,
    my_vote: this.props.node.comment_view.my_vote,
    score: this.props.node.comment_view.counts.score,
    upvotes: this.props.node.comment_view.counts.upvotes,
    downvotes: this.props.node.comment_view.counts.downvotes,
    borderColor: this.props.node.depth
      ? colorList[this.props.node.depth % colorList.length]
      : colorList[0],
    readLoading: false,
    saveLoading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
    this.handleReplyCancel = this.handleReplyCancel.bind(this);
    this.handleCommentUpvote = this.handleCommentUpvote.bind(this);
    this.handleCommentDownvote = this.handleCommentDownvote.bind(this);
  }

  // TODO see if there's a better way to do this, and all willReceiveProps
  componentWillReceiveProps(nextProps: CommentNodeProps) {
    let cv = nextProps.node.comment_view;
    this.state.my_vote = cv.my_vote;
    this.state.upvotes = cv.counts.upvotes;
    this.state.downvotes = cv.counts.downvotes;
    this.state.score = cv.counts.score;
    this.state.readLoading = false;
    this.state.saveLoading = false;
    this.setState(this.state);
  }

  render() {
    let node = this.props.node;
    let cv = this.props.node.comment_view;

    let purgeTypeText: string;
    if (this.state.purgeType == PurgeType.Comment) {
      purgeTypeText = i18n.t("purge_comment");
    } else if (this.state.purgeType == PurgeType.Person) {
      purgeTypeText = `${i18n.t("purge")} ${cv.creator.name}`;
    }

    let canMod_ = canMod(
      this.props.moderators,
      this.props.admins,
      cv.creator.id
    );
    let canAdmin_ = canAdmin(this.props.admins, cv.creator.id);
    let isMod_ = isMod(this.props.moderators, cv.creator.id);
    let isAdmin_ = isAdmin(this.props.admins, cv.creator.id);
    let amCommunityCreator_ = amCommunityCreator(
      this.props.moderators,
      cv.creator.id
    );

    return (
      <div
        className={`comment ${
          cv.comment.parent_id.isSome() && !this.props.noIndent ? "ml-1" : ""
        }`}
      >
        <div
          id={`comment-${cv.comment.id}`}
          className={`details comment-node py-2 ${
            !this.props.noBorder ? "border-top border-light" : ""
          } ${this.isCommentNew ? "mark" : ""}`}
          style={
            !this.props.noIndent &&
            cv.comment.parent_id.isSome() &&
            `border-left: 2px ${this.state.borderColor} solid !important`
          }
        >
          <div
            class={`${
              !this.props.noIndent && cv.comment.parent_id.isSome() && "ml-2"
            }`}
          >
            <div class="d-flex flex-wrap align-items-center text-muted small">
              <span class="mr-2">
                <PersonListing person={cv.creator} />
              </span>

              {this.isMod && (
                <div className="badge badge-light d-none d-sm-inline mr-2">
                  {i18n.t("mod")}
                </div>
              )}
              {this.isAdmin && (
                <div className="badge badge-light d-none d-sm-inline mr-2">
                  {i18n.t("admin")}
                </div>
              )}
              {this.isPostCreator && (
                <div className="badge badge-light d-none d-sm-inline mr-2">
                  {i18n.t("creator")}
                </div>
              )}
              {cv.creator.bot_account && (
                <div className="badge badge-light d-none d-sm-inline mr-2">
                  {i18n.t("bot_account").toLowerCase()}
                </div>
              )}
              {(cv.creator_banned_from_community || isBanned(cv.creator)) && (
                <div className="badge badge-danger mr-2">
                  {i18n.t("banned")}
                </div>
              )}
              {this.props.showCommunity && (
                <>
                  <span class="mx-1">{i18n.t("to")}</span>
                  <CommunityLink community={cv.community} />
                  <span class="mx-2">•</span>
                  <Link className="mr-2" to={`/post/${cv.post.id}`}>
                    {cv.post.name}
                  </Link>
                </>
              )}
              <button
                class="btn btn-sm text-muted"
                onClick={linkEvent(this, this.handleCommentCollapse)}
                aria-label={this.expandText}
                data-tippy-content={this.expandText}
              >
                {this.state.collapsed ? (
                  <Icon icon="plus-square" classes="icon-inline" />
                ) : (
                  <Icon icon="minus-square" classes="icon-inline" />
                )}
              </button>
              {this.linkBtn(true)}
              {!this.isPiBrowser && (
                <button
                  class="btn btn-sm text-muted"
                  onClick={linkEvent(this, this.handleTipComment)}
                  aria-label={i18n.t("tip")}
                  data-tippy-content={i18n.t("tip @") + cv.creator.name}
                >
                  {cv.creator.web3_address && (
                    <Icon icon="heart" classes={`icon-inline mr-1}`} />
                  )}
                  {!cv.creator.web3_address && (
                    <small>
                      <Icon icon="heart" classes={`icon-inline mr-1}`} />
                    </small>
                  )}
                </button>
              )}
              {!this.isPiBrowser && (
                <button
                  class="btn btn-sm text-muted"
                  onClick={linkEvent(this, this.handleBlockchainComment)}
                  aria-label={i18n.t("blockchain")}
                  data-tippy-content={i18n.t("save to blockchain")}
                >
                  <Icon icon="zap" classes="icon-inline" />
                </button>
              )}
              {this.isPiBrowser && (
                <button
                  class="btn btn-sm text-muted"
                  onClick={linkEvent(this, this.handlePiTipClick)}
                  aria-label={i18n.t("tip pi")}
                  data-tippy-content={
                    i18n.t("tip 0.1 test-π to @") + cv.creator.name
                  }
                >
                  {cv.creator.pi_address && (
                    <Icon icon="heart" classes={`icon-inline mr-1}`} />
                  )}
                  {!cv.creator.pi_address && (
                    <small>
                      <Icon icon="heart" classes={`icon-inline mr-1}`} />
                    </small>
                  )}
                </button>
              )}
              {this.isPiBrowser && (
                <button
                  class="btn btn-sm text-muted"
                  onClick={linkEvent(this, this.handlePiBlockchainClick)}
                  aria-label={i18n.t("to pi blockchain")}
                  data-tippy-content={i18n.t("save to pi blockchain")}
                >
                  <Icon icon="zap" classes="icon-inline" />
                </button>
              )}
              {cv.comment.tx && (
                <button
                  class="btn btn-link btn-animate text-muted p-0"
                  onClick={linkEvent(this, this.handleLinkBlockchainClick)}
                  aria-label={i18n.t("blockchain")}
                  data-tippy-content={i18n.t("link on blockchain")}
                >
                  <Icon icon="external-link" classes={`icon-inline mr-1`} />
                </button>
              )}
              {/* This is an expanding spacer for mobile */}
              <div className="mr-lg-5 flex-grow-1 flex-lg-grow-0 unselectable pointer mx-2"></div>
              {showScores() && (
                <>
                  <a
                    className={`unselectable pointer ${this.scoreColor}`}
                    onClick={linkEvent(node, this.handleCommentUpvote)}
                    data-tippy-content={this.pointsTippy}
                  >
                    <span
                      class="mr-1 font-weight-bold"
                      aria-label={i18n.t("number_of_points", {
                        count: this.state.score,
                        formattedCount: this.state.score,
                      })}
                    >
                      {numToSI(this.state.score)}
                    </span>
                  </a>
                  <span className="mr-1">•</span>
                </>
              )}
              <span>
                <MomentTime
                  published={cv.comment.published}
                  updated={cv.comment.updated}
                />
              </span>
            </div>
            {/* end of user row */}
            {this.state.showEdit && (
              <CommentForm
                node={Left(node)}
                edit
                onReplyCancel={this.handleReplyCancel}
                disabled={this.props.locked}
                focus
              />
            )}
            {!this.state.showEdit && !this.state.collapsed && (
              <div>
                {this.state.viewSource ? (
                  <pre>{this.commentUnlessRemoved}</pre>
                ) : (
                  <div
                    className="md-div"
                    dangerouslySetInnerHTML={mdToHtml(
                      this.commentUnlessRemoved
                    )}
                  />
                )}
                <div class="d-flex justify-content-between justify-content-lg-start flex-wrap text-muted font-weight-bold">
                  {this.props.showContext && this.linkBtn()}
                  {this.props.markable && (
                    <button
                      class="btn btn-link btn-animate text-muted"
                      onClick={linkEvent(this, this.handleMarkRead)}
                      data-tippy-content={
                        this.commentOrMentionRead
                          ? i18n.t("mark_as_unread")
                          : i18n.t("mark_as_read")
                      }
                      aria-label={
                        this.commentOrMentionRead
                          ? i18n.t("mark_as_unread")
                          : i18n.t("mark_as_read")
                      }
                    >
                      {this.state.readLoading ? (
                        this.loadingIcon
                      ) : (
                        <Icon
                          icon="check"
                          classes={`icon-inline ${
                            this.commentOrMentionRead && "text-success"
                          }`}
                        />
                      )}
                    </button>
                  )}
                  {UserService.Instance.myUserInfo.isSome() &&
                    !this.props.viewOnly && (
                      <>
                        <button
                          className={`btn btn-link btn-animate ${
                            this.state.my_vote.unwrapOr(0) == 1
                              ? "text-info"
                              : "text-muted"
                          }`}
                          onClick={linkEvent(node, this.handleCommentUpvote)}
                          data-tippy-content={i18n.t("upvote")}
                          aria-label={i18n.t("upvote")}
                        >
                          <Icon icon="arrow-up1" classes="icon-inline" />
                          {showScores() &&
                            this.state.upvotes !== this.state.score && (
                              <span class="ml-1">
                                {numToSI(this.state.upvotes)}
                              </span>
                            )}
                        </button>
                        {this.props.enableDownvotes && (
                          <button
                            className={`btn btn-link btn-animate ${
                              this.state.my_vote.unwrapOr(0) == -1
                                ? "text-danger"
                                : "text-muted"
                            }`}
                            onClick={linkEvent(
                              node,
                              this.handleCommentDownvote
                            )}
                            data-tippy-content={i18n.t("downvote")}
                            aria-label={i18n.t("downvote")}
                          >
                            <Icon icon="arrow-down1" classes="icon-inline" />
                            {showScores() &&
                              this.state.upvotes !== this.state.score && (
                                <span class="ml-1">
                                  {numToSI(this.state.downvotes)}
                                </span>
                              )}
                          </button>
                        )}
                        <button
                          class="btn btn-link btn-animate text-muted"
                          onClick={linkEvent(this, this.handleReplyClick)}
                          data-tippy-content={i18n.t("reply")}
                          aria-label={i18n.t("reply")}
                        >
                          <Icon icon="reply1" classes="icon-inline" />
                        </button>
                        {!this.state.showAdvanced ? (
                          <button
                            className="btn btn-link btn-animate text-muted"
                            onClick={linkEvent(this, this.handleShowAdvanced)}
                            data-tippy-content={i18n.t("more")}
                            aria-label={i18n.t("more")}
                          >
                            <Icon icon="more-vertical" classes="icon-inline" />
                          </button>
                        ) : (
                          <>
                            {!this.myComment && (
                              <>
                                <button class="btn btn-link btn-animate">
                                  <Link
                                    className="text-muted"
                                    to={`/create_private_message/recipient/${cv.creator.id}`}
                                    title={i18n.t("message").toLowerCase()}
                                  >
                                    <Icon icon="mail" />
                                  </Link>
                                </button>
                                <button
                                  class="btn btn-link btn-animate text-muted"
                                  onClick={linkEvent(
                                    this,
                                    this.handleShowReportDialog
                                  )}
                                  data-tippy-content={i18n.t(
                                    "show_report_dialog"
                                  )}
                                  aria-label={i18n.t("show_report_dialog")}
                                >
                                  <Icon icon="flag" />
                                </button>
                                <button
                                  class="btn btn-link btn-animate text-muted"
                                  onClick={linkEvent(
                                    this,
                                    this.handleBlockUserClick
                                  )}
                                  data-tippy-content={i18n.t("block_user")}
                                  aria-label={i18n.t("block_user")}
                                >
                                  <Icon icon="slash" />
                                </button>
                              </>
                            )}
                            <button
                              class="btn btn-link btn-animate text-muted"
                              onClick={linkEvent(
                                this,
                                this.handleSaveCommentClick
                              )}
                              data-tippy-content={
                                cv.saved ? i18n.t("unsave") : i18n.t("save")
                              }
                              aria-label={
                                cv.saved ? i18n.t("unsave") : i18n.t("save")
                              }
                            >
                              {this.state.saveLoading ? (
                                this.loadingIcon
                              ) : (
                                <Icon
                                  icon="star"
                                  classes={`icon-inline ${
                                    cv.saved && "text-warning"
                                  }`}
                                />
                              )}
                            </button>
                            <button
                              className="btn btn-link btn-animate text-muted"
                              onClick={linkEvent(this, this.handleViewSource)}
                              data-tippy-content={i18n.t("view_source")}
                              aria-label={i18n.t("view_source")}
                            >
                              <Icon
                                icon="file-text"
                                classes={`icon-inline ${
                                  this.state.viewSource && "text-success"
                                }`}
                              />
                            </button>
                            {this.myComment && (
                              <>
                                <button
                                  class="btn btn-link btn-animate text-muted"
                                  onClick={linkEvent(
                                    this,
                                    this.handleEditClick
                                  )}
                                  data-tippy-content={i18n.t("edit")}
                                  aria-label={i18n.t("edit")}
                                >
                                  <Icon icon="edit" classes="icon-inline" />
                                </button>
                                <button
                                  class="btn btn-link btn-animate text-muted"
                                  onClick={linkEvent(
                                    this,
                                    this.handleDeleteClick
                                  )}
                                  data-tippy-content={
                                    !cv.comment.deleted
                                      ? i18n.t("delete")
                                      : i18n.t("restore")
                                  }
                                  aria-label={
                                    !cv.comment.deleted
                                      ? i18n.t("delete")
                                      : i18n.t("restore")
                                  }
                                >
                                  <Icon
                                    icon="trash"
                                    classes={`icon-inline ${
                                      cv.comment.deleted && "text-danger"
                                    }`}
                                  />
                                </button>
                              </>
                            )}
                            {/* Admins and mods can remove comments */}
                            {(canMod_ || canAdmin_) && (
                              <>
                                {!cv.comment.removed ? (
                                  <button
                                    class="btn btn-link btn-animate text-muted"
                                    onClick={linkEvent(
                                      this,
                                      this.handleModRemoveShow
                                    )}
                                    aria-label={i18n.t("remove")}
                                  >
                                    {i18n.t("remove")}
                                  </button>
                                ) : (
                                  <button
                                    class="btn btn-link btn-animate text-muted"
                                    onClick={linkEvent(
                                      this,
                                      this.handleModRemoveSubmit
                                    )}
                                    aria-label={i18n.t("restore")}
                                  >
                                    {i18n.t("restore")}
                                  </button>
                                )}
                              </>
                            )}
                            {/* Mods can ban from community, and appoint as mods to community */}
                            {canMod_ && (
                              <>
                                {!isMod_ &&
                                  (!cv.creator_banned_from_community ? (
                                    <button
                                      class="btn btn-link btn-animate text-muted"
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
                                      class="btn btn-link btn-animate text-muted"
                                      onClick={linkEvent(
                                        this,
                                        this.handleModBanFromCommunitySubmit
                                      )}
                                      aria-label={i18n.t("unban")}
                                    >
                                      {i18n.t("unban")}
                                    </button>
                                  ))}
                                {!cv.creator_banned_from_community &&
                                  (!this.state.showConfirmAppointAsMod ? (
                                    <button
                                      class="btn btn-link btn-animate text-muted"
                                      onClick={linkEvent(
                                        this,
                                        this.handleShowConfirmAppointAsMod
                                      )}
                                      aria-label={
                                        isMod_
                                          ? i18n.t("remove_as_mod")
                                          : i18n.t("appoint_as_mod")
                                      }
                                    >
                                      {isMod_
                                        ? i18n.t("remove_as_mod")
                                        : i18n.t("appoint_as_mod")}
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        class="btn btn-link btn-animate text-muted"
                                        aria-label={i18n.t("are_you_sure")}
                                      >
                                        {i18n.t("are_you_sure")}
                                      </button>
                                      <button
                                        class="btn btn-link btn-animate text-muted"
                                        onClick={linkEvent(
                                          this,
                                          this.handleAddModToCommunity
                                        )}
                                        aria-label={i18n.t("yes")}
                                      >
                                        {i18n.t("yes")}
                                      </button>
                                      <button
                                        class="btn btn-link btn-animate text-muted"
                                        onClick={linkEvent(
                                          this,
                                          this.handleCancelConfirmAppointAsMod
                                        )}
                                        aria-label={i18n.t("no")}
                                      >
                                        {i18n.t("no")}
                                      </button>
                                    </>
                                  ))}
                              </>
                            )}
                            {/* Community creators and admins can transfer community to another mod */}
                            {(amCommunityCreator_ || canAdmin_) &&
                              isMod_ &&
                              cv.creator.local &&
                              (!this.state.showConfirmTransferCommunity ? (
                                <button
                                  class="btn btn-link btn-animate text-muted"
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
                                    class="btn btn-link btn-animate text-muted"
                                    aria-label={i18n.t("are_you_sure")}
                                  >
                                    {i18n.t("are_you_sure")}
                                  </button>
                                  <button
                                    class="btn btn-link btn-animate text-muted"
                                    onClick={linkEvent(
                                      this,
                                      this.handleTransferCommunity
                                    )}
                                    aria-label={i18n.t("yes")}
                                  >
                                    {i18n.t("yes")}
                                  </button>
                                  <button
                                    class="btn btn-link btn-animate text-muted"
                                    onClick={linkEvent(
                                      this,
                                      this
                                        .handleCancelShowConfirmTransferCommunity
                                    )}
                                    aria-label={i18n.t("no")}
                                  >
                                    {i18n.t("no")}
                                  </button>
                                </>
                              ))}
                            {/* Admins can ban from all, and appoint other admins */}
                            {canAdmin_ && (
                              <>
                                {!isAdmin_ && (
                                  <>
                                    <button
                                      class="btn btn-link btn-animate text-muted"
                                      onClick={linkEvent(
                                        this,
                                        this.handlePurgePersonShow
                                      )}
                                      aria-label={i18n.t("purge_user")}
                                    >
                                      {i18n.t("purge_user")}
                                    </button>
                                    <button
                                      class="btn btn-link btn-animate text-muted"
                                      onClick={linkEvent(
                                        this,
                                        this.handlePurgeCommentShow
                                      )}
                                      aria-label={i18n.t("purge_comment")}
                                    >
                                      {i18n.t("purge_comment")}
                                    </button>

                                    {!isBanned(cv.creator) ? (
                                      <button
                                        class="btn btn-link btn-animate text-muted"
                                        onClick={linkEvent(
                                          this,
                                          this.handleModBanShow
                                        )}
                                        aria-label={i18n.t("ban_from_site")}
                                      >
                                        {i18n.t("ban_from_site")}
                                      </button>
                                    ) : (
                                      <button
                                        class="btn btn-link btn-animate text-muted"
                                        onClick={linkEvent(
                                          this,
                                          this.handleModBanSubmit
                                        )}
                                        aria-label={i18n.t("unban_from_site")}
                                      >
                                        {i18n.t("unban_from_site")}
                                      </button>
                                    )}
                                  </>
                                )}
                                {!isBanned(cv.creator) &&
                                  cv.creator.local &&
                                  (!this.state.showConfirmAppointAsAdmin ? (
                                    <button
                                      class="btn btn-link btn-animate text-muted"
                                      onClick={linkEvent(
                                        this,
                                        this.handleShowConfirmAppointAsAdmin
                                      )}
                                      aria-label={
                                        isAdmin_
                                          ? i18n.t("remove_as_admin")
                                          : i18n.t("appoint_as_admin")
                                      }
                                    >
                                      {isAdmin_
                                        ? i18n.t("remove_as_admin")
                                        : i18n.t("appoint_as_admin")}
                                    </button>
                                  ) : (
                                    <>
                                      <button class="btn btn-link btn-animate text-muted">
                                        {i18n.t("are_you_sure")}
                                      </button>
                                      <button
                                        class="btn btn-link btn-animate text-muted"
                                        onClick={linkEvent(
                                          this,
                                          this.handleAddAdmin
                                        )}
                                        aria-label={i18n.t("yes")}
                                      >
                                        {i18n.t("yes")}
                                      </button>
                                      <button
                                        class="btn btn-link btn-animate text-muted"
                                        onClick={linkEvent(
                                          this,
                                          this.handleCancelConfirmAppointAsAdmin
                                        )}
                                        aria-label={i18n.t("no")}
                                      >
                                        {i18n.t("no")}
                                      </button>
                                    </>
                                  ))}
                              </>
                            )}
                          </>
                        )}
                      </>
                    )}
                </div>
                {/* end of button group */}
              </div>
            )}
          </div>
        </div>
        {/* end of details */}
        {this.state.showRemoveDialog && (
          <form
            class="form-inline"
            onSubmit={linkEvent(this, this.handleModRemoveSubmit)}
          >
            <label
              class="sr-only"
              htmlFor={`mod-remove-reason-${cv.comment.id}`}
            >
              {i18n.t("reason")}
            </label>
            <input
              type="text"
              id={`mod-remove-reason-${cv.comment.id}`}
              class="form-control mr-2"
              placeholder={i18n.t("reason")}
              value={toUndefined(this.state.removeReason)}
              onInput={linkEvent(this, this.handleModRemoveReasonChange)}
            />
            <button
              type="submit"
              class="btn btn-secondary"
              aria-label={i18n.t("remove_comment")}
            >
              {i18n.t("remove_comment")}
            </button>
          </form>
        )}
        {this.state.showReportDialog && (
          <form
            class="form-inline"
            onSubmit={linkEvent(this, this.handleReportSubmit)}
          >
            <label class="sr-only" htmlFor={`report-reason-${cv.comment.id}`}>
              {i18n.t("reason")}
            </label>
            <input
              type="text"
              required
              id={`report-reason-${cv.comment.id}`}
              class="form-control mr-2"
              placeholder={i18n.t("reason")}
              value={this.state.reportReason}
              onInput={linkEvent(this, this.handleReportReasonChange)}
            />
            <button
              type="submit"
              class="btn btn-secondary"
              aria-label={i18n.t("create_report")}
            >
              {i18n.t("create_report")}
            </button>
          </form>
        )}
        {this.state.showBanDialog && (
          <form onSubmit={linkEvent(this, this.handleModBanBothSubmit)}>
            <div class="form-group row col-12">
              <label
                class="col-form-label"
                htmlFor={`mod-ban-reason-${cv.comment.id}`}
              >
                {i18n.t("reason")}
              </label>
              <input
                type="text"
                id={`mod-ban-reason-${cv.comment.id}`}
                class="form-control mr-2"
                placeholder={i18n.t("reason")}
                value={toUndefined(this.state.banReason)}
                onInput={linkEvent(this, this.handleModBanReasonChange)}
              />
              <label
                class="col-form-label"
                htmlFor={`mod-ban-expires-${cv.comment.id}`}
              >
                {i18n.t("expires")}
              </label>
              <input
                type="number"
                id={`mod-ban-expires-${cv.comment.id}`}
                class="form-control mr-2"
                placeholder={i18n.t("number_of_days")}
                value={toUndefined(this.state.banExpireDays)}
                onInput={linkEvent(this, this.handleModBanExpireDaysChange)}
              />
              <div class="form-group">
                <div class="form-check">
                  <input
                    class="form-check-input"
                    id="mod-ban-remove-data"
                    type="checkbox"
                    checked={this.state.removeData}
                    onChange={linkEvent(this, this.handleModRemoveDataChange)}
                  />
                  <label
                    class="form-check-label"
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
            <div class="form-group row">
              <button
                type="submit"
                class="btn btn-secondary"
                aria-label={i18n.t("ban")}
              >
                {i18n.t("ban")} {cv.creator.name}
              </button>
            </div>
          </form>
        )}

        {this.state.showPurgeDialog && (
          <form onSubmit={linkEvent(this, this.handlePurgeSubmit)}>
            <PurgeWarning />
            <label class="sr-only" htmlFor="purge-reason">
              {i18n.t("reason")}
            </label>
            <input
              type="text"
              id="purge-reason"
              class="form-control my-3"
              placeholder={i18n.t("reason")}
              value={toUndefined(this.state.purgeReason)}
              onInput={linkEvent(this, this.handlePurgeReasonChange)}
            />
            <div class="form-group row col-12">
              {this.state.purgeLoading ? (
                <Spinner />
              ) : (
                <button
                  type="submit"
                  class="btn btn-secondary"
                  aria-label={purgeTypeText}
                >
                  {purgeTypeText}
                </button>
              )}
            </div>
          </form>
        )}
        {this.state.showReply && (
          <CommentForm
            node={Left(node)}
            onReplyCancel={this.handleReplyCancel}
            disabled={this.props.locked}
            focus
          />
        )}
        {!this.state.collapsed && node.children && (
          <CommentNodes
            nodes={node.children}
            locked={this.props.locked}
            moderators={this.props.moderators}
            admins={this.props.admins}
            maxCommentsShown={None}
            enableDownvotes={this.props.enableDownvotes}
          />
        )}
        {/* A collapsed clearfix */}
        {this.state.collapsed && <div class="row col-12"></div>}
      </div>
    );
  }

  get isPiBrowser(): boolean {
    return isBrowser() && navigator.userAgent.includes("PiBrowser");
  }

  get commentOrMentionRead() {
    let cv = this.props.node.comment_view;
    return this.isPersonMentionType(cv)
      ? cv.person_mention.read
      : cv.comment.read;
  }

  linkBtn(small = false) {
    let cv = this.props.node.comment_view;
    let classnames = classNames("btn btn-link btn-animate text-muted", {
      "btn-sm": small,
    });

    let title = this.props.showContext
      ? i18n.t("show_context")
      : i18n.t("link");

    return (
      <>
        <Link
          className={classnames}
          to={`/post/${cv.post.id}/comment/${cv.comment.id}`}
          title={title}
        >
          <Icon icon="link" classes="icon-inline" />
        </Link>
        {
          <a className={classnames} title={title} href={cv.comment.ap_id}>
            <Icon icon="fedilink" classes="icon-inline" />
          </a>
        }
      </>
    );
  }

  get loadingIcon() {
    return <Spinner />;
  }

  get myComment(): boolean {
    return UserService.Instance.myUserInfo
      .map(
        m =>
          m.local_user_view.person.id == this.props.node.comment_view.creator.id
      )
      .unwrapOr(false);
  }

  get isPostCreator(): boolean {
    return (
      this.props.node.comment_view.creator.id ==
      this.props.node.comment_view.post.creator_id
    );
  }

  get commentUnlessRemoved(): string {
    let comment = this.props.node.comment_view.comment;
    return comment.removed
      ? `*${i18n.t("removed")}*`
      : comment.deleted
      ? `*${i18n.t("deleted")}*`
      : comment.content;
  }

  handleReplyClick(i: CommentNode) {
    i.state.showReply = true;
    i.setState(i.state);
  }

  handleEditClick(i: CommentNode) {
    i.state.showEdit = true;
    i.setState(i.state);
  }

  handleBlockUserClick(i: CommentNode) {
    let blockUserForm = new BlockPerson({
      person_id: i.props.node.comment_view.creator.id,
      block: true,
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(wsClient.blockPerson(blockUserForm));
  }

  handleDeleteClick(i: CommentNode) {
    let comment = i.props.node.comment_view.comment;
    let deleteForm = new DeleteComment({
      comment_id: comment.id,
      deleted: !comment.deleted,
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(wsClient.deleteComment(deleteForm));
  }

  handleSaveCommentClick(i: CommentNode) {
    let cv = i.props.node.comment_view;
    let save = cv.saved == undefined ? true : !cv.saved;
    let form = new SaveComment({
      comment_id: cv.comment.id,
      save,
      auth: auth().unwrap(),
    });

    WebSocketService.Instance.send(wsClient.saveComment(form));

    i.state.saveLoading = true;
    i.setState(this.state);
  }

  handleReplyCancel() {
    this.state.showReply = false;
    this.state.showEdit = false;
    this.setState(this.state);
  }

  handleCommentUpvote(i: CommentNodeI, event: any) {
    event.preventDefault();
    let myVote = this.state.my_vote.unwrapOr(0);
    let newVote = myVote == 1 ? 0 : 1;

    if (myVote == 1) {
      this.state.score--;
      this.state.upvotes--;
    } else if (myVote == -1) {
      this.state.downvotes--;
      this.state.upvotes++;
      this.state.score += 2;
    } else {
      this.state.upvotes++;
      this.state.score++;
    }

    this.state.my_vote = Some(newVote);

    let form = new CreateCommentLike({
      comment_id: i.comment_view.comment.id,
      score: newVote,
      auth: auth().unwrap(),
    });

    WebSocketService.Instance.send(wsClient.likeComment(form));
    this.setState(this.state);
    setupTippy();
  }

  handleCommentDownvote(i: CommentNodeI, event: any) {
    event.preventDefault();
    let myVote = this.state.my_vote.unwrapOr(0);
    let newVote = myVote == -1 ? 0 : -1;

    if (myVote == 1) {
      this.state.score -= 2;
      this.state.upvotes--;
      this.state.downvotes++;
    } else if (myVote == -1) {
      this.state.downvotes--;
      this.state.score++;
    } else {
      this.state.downvotes++;
      this.state.score--;
    }

    this.state.my_vote = Some(newVote);

    let form = new CreateCommentLike({
      comment_id: i.comment_view.comment.id,
      score: newVote,
      auth: auth().unwrap(),
    });

    WebSocketService.Instance.send(wsClient.likeComment(form));
    this.setState(this.state);
    setupTippy();
  }

  handleShowReportDialog(i: CommentNode) {
    i.state.showReportDialog = !i.state.showReportDialog;
    i.setState(i.state);
  }

  handleReportReasonChange(i: CommentNode, event: any) {
    i.state.reportReason = event.target.value;
    i.setState(i.state);
  }

  handleReportSubmit(i: CommentNode) {
    let comment = i.props.node.comment_view.comment;
    let form = new CreateCommentReport({
      comment_id: comment.id,
      reason: i.state.reportReason,
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(wsClient.createCommentReport(form));

    i.state.showReportDialog = false;
    i.setState(i.state);
  }

  handleModRemoveShow(i: CommentNode) {
    i.state.showRemoveDialog = !i.state.showRemoveDialog;
    i.state.showBanDialog = false;
    i.setState(i.state);
  }

  handleModRemoveReasonChange(i: CommentNode, event: any) {
    i.state.removeReason = Some(event.target.value);
    i.setState(i.state);
  }

  handleModRemoveDataChange(i: CommentNode, event: any) {
    i.state.removeData = event.target.checked;
    i.setState(i.state);
  }

  handleModRemoveSubmit(i: CommentNode) {
    let comment = i.props.node.comment_view.comment;
    let form = new RemoveComment({
      comment_id: comment.id,
      removed: !comment.removed,
      reason: i.state.removeReason,
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(wsClient.removeComment(form));

    i.state.showRemoveDialog = false;
    i.setState(i.state);
  }

  isPersonMentionType(
    item: CommentView | PersonMentionView
  ): item is PersonMentionView {
    return (item as PersonMentionView).person_mention?.id !== undefined;
  }

  handleMarkRead(i: CommentNode) {
    if (i.isPersonMentionType(i.props.node.comment_view)) {
      let form = new MarkPersonMentionAsRead({
        person_mention_id: i.props.node.comment_view.person_mention.id,
        read: !i.props.node.comment_view.person_mention.read,
        auth: auth().unwrap(),
      });
      WebSocketService.Instance.send(wsClient.markPersonMentionAsRead(form));
    } else {
      let form = new MarkCommentAsRead({
        comment_id: i.props.node.comment_view.comment.id,
        read: !i.props.node.comment_view.comment.read,
        auth: auth().unwrap(),
      });
      WebSocketService.Instance.send(wsClient.markCommentAsRead(form));
    }

    i.state.readLoading = true;
    i.setState(this.state);
  }

  handleModBanFromCommunityShow(i: CommentNode) {
    i.state.showBanDialog = true;
    i.state.banType = BanType.Community;
    i.state.showRemoveDialog = false;
    i.setState(i.state);
  }

  handleModBanShow(i: CommentNode) {
    i.state.showBanDialog = true;
    i.state.banType = BanType.Site;
    i.state.showRemoveDialog = false;
    i.setState(i.state);
  }

  handleModBanReasonChange(i: CommentNode, event: any) {
    i.state.banReason = Some(event.target.value);
    i.setState(i.state);
  }

  handleModBanExpireDaysChange(i: CommentNode, event: any) {
    i.state.banExpireDays = Some(event.target.value);
    i.setState(i.state);
  }

  handleModBanFromCommunitySubmit(i: CommentNode) {
    i.state.banType = BanType.Community;
    i.setState(i.state);
    i.handleModBanBothSubmit(i);
  }

  handleModBanSubmit(i: CommentNode) {
    i.state.banType = BanType.Site;
    i.setState(i.state);
    i.handleModBanBothSubmit(i);
  }

  handleModBanBothSubmit(i: CommentNode) {
    let cv = i.props.node.comment_view;

    if (i.state.banType == BanType.Community) {
      // If its an unban, restore all their data
      let ban = !cv.creator_banned_from_community;
      if (ban == false) {
        i.state.removeData = false;
      }
      let form = new BanFromCommunity({
        person_id: cv.creator.id,
        community_id: cv.community.id,
        ban,
        remove_data: Some(i.state.removeData),
        reason: i.state.banReason,
        expires: i.state.banExpireDays.map(futureDaysToUnixTime),
        auth: auth().unwrap(),
      });
      WebSocketService.Instance.send(wsClient.banFromCommunity(form));
    } else {
      // If its an unban, restore all their data
      let ban = !cv.creator.banned;
      if (ban == false) {
        i.state.removeData = false;
      }
      let form = new BanPerson({
        person_id: cv.creator.id,
        ban,
        remove_data: Some(i.state.removeData),
        reason: i.state.banReason,
        expires: i.state.banExpireDays.map(futureDaysToUnixTime),
        auth: auth().unwrap(),
      });
      WebSocketService.Instance.send(wsClient.banPerson(form));
    }

    i.state.showBanDialog = false;
    i.setState(i.state);
  }

  handlePurgePersonShow(i: CommentNode) {
    i.state.showPurgeDialog = true;
    i.state.purgeType = PurgeType.Person;
    i.state.showRemoveDialog = false;
    i.setState(i.state);
  }

  handlePurgeCommentShow(i: CommentNode) {
    i.state.showPurgeDialog = true;
    i.state.purgeType = PurgeType.Comment;
    i.state.showRemoveDialog = false;
    i.setState(i.state);
  }

  handlePurgeReasonChange(i: CommentNode, event: any) {
    i.state.purgeReason = Some(event.target.value);
    i.setState(i.state);
  }

  handlePurgeSubmit(i: CommentNode, event: any) {
    event.preventDefault();

    if (i.state.purgeType == PurgeType.Person) {
      let form = new PurgePerson({
        person_id: i.props.node.comment_view.creator.id,
        reason: i.state.purgeReason,
        auth: auth().unwrap(),
      });
      WebSocketService.Instance.send(wsClient.purgePerson(form));
    } else if (i.state.purgeType == PurgeType.Comment) {
      let form = new PurgeComment({
        comment_id: i.props.node.comment_view.comment.id,
        reason: i.state.purgeReason,
        auth: auth().unwrap(),
      });
      WebSocketService.Instance.send(wsClient.purgeComment(form));
    }

    i.state.purgeLoading = true;
    i.setState(i.state);
  }

  handleShowConfirmAppointAsMod(i: CommentNode) {
    i.state.showConfirmAppointAsMod = true;
    i.setState(i.state);
  }

  handleCancelConfirmAppointAsMod(i: CommentNode) {
    i.state.showConfirmAppointAsMod = false;
    i.setState(i.state);
  }

  handleAddModToCommunity(i: CommentNode) {
    let cv = i.props.node.comment_view;
    let form = new AddModToCommunity({
      person_id: cv.creator.id,
      community_id: cv.community.id,
      added: !isMod(i.props.moderators, cv.creator.id),
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(wsClient.addModToCommunity(form));
    i.state.showConfirmAppointAsMod = false;
    i.setState(i.state);
  }

  handleShowConfirmAppointAsAdmin(i: CommentNode) {
    i.state.showConfirmAppointAsAdmin = true;
    i.setState(i.state);
  }

  handleCancelConfirmAppointAsAdmin(i: CommentNode) {
    i.state.showConfirmAppointAsAdmin = false;
    i.setState(i.state);
  }

  handleAddAdmin(i: CommentNode) {
    let creatorId = i.props.node.comment_view.creator.id;
    let form = new AddAdmin({
      person_id: creatorId,
      added: !isAdmin(i.props.admins, creatorId),
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(wsClient.addAdmin(form));
    i.state.showConfirmAppointAsAdmin = false;
    i.setState(i.state);
  }

  handleShowConfirmTransferCommunity(i: CommentNode) {
    i.state.showConfirmTransferCommunity = true;
    i.setState(i.state);
  }

  handleCancelShowConfirmTransferCommunity(i: CommentNode) {
    i.state.showConfirmTransferCommunity = false;
    i.setState(i.state);
  }

  handleTransferCommunity(i: CommentNode) {
    let cv = i.props.node.comment_view;
    let form = new TransferCommunity({
      community_id: cv.community.id,
      person_id: cv.creator.id,
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(wsClient.transferCommunity(form));
    i.state.showConfirmTransferCommunity = false;
    i.setState(i.state);
  }

  handleShowConfirmTransferSite(i: CommentNode) {
    i.state.showConfirmTransferSite = true;
    i.setState(i.state);
  }

  handleCancelShowConfirmTransferSite(i: CommentNode) {
    i.state.showConfirmTransferSite = false;
    i.setState(i.state);
  }

  get isCommentNew(): boolean {
    let now = moment.utc().subtract(10, "minutes");
    let then = moment.utc(this.props.node.comment_view.comment.published);
    return now.isBefore(then);
  }

  handleCommentCollapse(i: CommentNode) {
    i.state.collapsed = !i.state.collapsed;
    i.setState(i.state);
    setupTippy();
  }

  handleViewSource(i: CommentNode) {
    i.state.viewSource = !i.state.viewSource;
    i.setState(i.state);
  }

  handleShowAdvanced(i: CommentNode) {
    i.state.showAdvanced = !i.state.showAdvanced;
    i.setState(i.state);
    setupTippy();
  }

  get scoreColor() {
    if (this.state.my_vote.unwrapOr(0) == 1) {
      return "text-info";
    } else if (this.state.my_vote.unwrapOr(0) == -1) {
      return "text-danger";
    } else {
      return "text-muted";
    }
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

  get expandText(): string {
    return this.state.collapsed ? i18n.t("expand") : i18n.t("collapse");
  }
  async handleLinkBlockchainClick(i: CommentNode) {
    var url = i.props.node.comment_view.comment.tx;
    window.open(url, "_blank");
  }

  async handleBlockchainComment(i: CommentNode) {
    if (this.isPiBrowser) return;
    const isMetaMaskInstalled = () => {
      //Have to check the ethereum binding on the window object to see if it's installed
      const { ethereum } = window;
      return Boolean(ethereum && ethereum.isMetaMask);
    };

    var config = {
      memo: "wepi:comment",
      metadata: {
        id: i.props.node.comment_view.comment.id,
        own: i.props.node.comment_view.comment.creator_id,
        post_id: i.props.node.comment_view.comment.post_id,
        parent_id: i.props.node.comment_view.comment.parent_id,
        ap_id: i.props.node.comment_view.comment.ap_id,
        content: i.props.node.comment_view.comment.content,
        t: i.props.node.comment_view.comment.published,
        u: i.props.node.comment_view.comment.updated,
        sign: i.props.node.comment_view.comment.cert,
      },
    };
    var str = utf8ToHex(JSON.stringify(config));
    if (isMetaMaskInstalled()) {
      console.log("handleBlockchainComment");
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
          .catch(error => console.log(error));
      } catch (error) {
        console.error(error);
      }
    }
  }

  async handleTipComment(i: CommentNode) {
    if (!i.props.node.comment_view.creator.web3_address) return;
    if (this.isPiBrowser) return;
    const isMetaMaskInstalled = () => {
      //Have to check the ethereum binding on the window object to see if it's installed
      const { ethereum } = window;
      return Boolean(ethereum && ethereum.isMetaMask);
    };

    var config = {
      memo: "wepi:tip:" + i.props.node.comment_view.creator.name,
      metadata: {
        id: i.props.node.comment_view.creator.id,
        post_id: i.props.node.comment_view.post.id,
        comment_id: i.props.node.comment_view.comment.id,
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
                to:
                  i.props.node.comment_view.creator.web3_address ||
                  web3TipAddress,
                gasPrice: gasPrice,
                value: eth01,
                data: "0x" + str,
              },
            ],
          })
          .then(txHash => console.log(txHash))
          .catch(error => console.error);
      } catch (error) {
        console.log(error);
      }
    }
  }

  async handlePiTipClick(i: CommentNode) {
    var config = {
      amount: 0.1,
      //memo: ('wepi:tip:'+i.props.node.comment_view.creator.name).substr(0,28),
      memo: "wepi:tip:comment",
      metadata: {
        id: i.props.node.comment_view.creator.id,
        post_id: i.props.node.comment_view.post.id,
        comment_id: i.props.node.comment_view.comment.id,
        address: i.props.node.comment_view.creator.pi_address,
        t: i.props.node.comment_view.comment.published,
        u: i.props.node.comment_view.comment.updated,
      },
    };
    var info = {
      own: i.props.node.comment_view.comment.creator_id,
      comment:
        "tip commentt;" +
        i.props.node.comment_view.creator.name +
        ";" +
        i.props.node.comment_view.comment.id,
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

    const onReadyForApproval = async (payment_id, paymentConfig) => {
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
    const onReadyForCompletion = (payment_id, txid, paymentConfig) => {
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
          if (data.status >= 200 && data.status < 300) {
            return true;
          } else {
            //alert("Payment complete error: " + JSON.stringify(data));
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

  async handlePiBlockchainClick(i: CommentNode) {
    var config = {
      amount: 0.001,
      memo: "wepi:comment",
      metadata: {
        id: i.props.node.comment_view.comment.id,
        own: i.props.node.comment_view.comment.creator_id,
        post_id: i.props.node.comment_view.comment.post_id,
        parent_id: i.props.node.comment_view.comment.parent_id,
        ap_id: i.props.node.comment_view.comment.ap_id,
        content: i.props.node.comment_view.comment.content,
        t: i.props.node.comment_view.comment.published,
        u: i.props.node.comment_view.comment.updated,
        sign: i.props.node.comment_view.comment.cert,
      },
    };
    var info = {
      own: i.props.node.comment_view.comment.creator_id,
      comment: i.props.node.comment_view.comment.id,
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
          if (data.status >= 200 && data.status < 300) {
            return true;
          } else {
            //alert("Completing payment error: " + JSON.stringify(data));
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
}
