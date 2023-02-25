import { Component, linkEvent } from "inferno";
import {
  BlockCommunity,
  BlockCommunityResponse,
  BlockPerson,
  BlockPersonResponse,
  ChangePassword,
  CommunityBlockView,
  CommunityResponse,
  CommunityView,
  CreateCommunity,
  CreatePayment,
  DeleteAccount,
  ExternalAccount,
  GetPayments,
  GetPiBalances,
  GetPiBalancesResponse,
  GetSiteResponse,
  ListingType,
  Login,
  LoginResponse,
  PersonBlockView,
  PersonViewSafe,
  PiLogin,
  PiPaymentFound,
  PiWithdraw,
  PiWithdrawResponse,
  SaveUserSettings,
  SendPayment,
  SortType,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n, languages } from "../../i18next";
import { createPayment } from "../../pisdk";
import { UserService, WebSocketService } from "../../services";
import {
  amAdmin,
  capitalizeFirstLetter,
  choicesConfig,
  communitySelectName,
  communityToChoice,
  debounce,
  elementUrl,
  enableNsfw,
  eth001,
  fetchCommunities,
  fetchThemeList,
  fetchUsers,
  gasPrice,
  getLanguages,
  isBrowser,
  myAuth,
  personSelectName,
  personToChoice,
  relTags,
  setIsoData,
  setTheme,
  setupTippy,
  showLocal,
  toast,
  updateCommunityBlock,
  updatePersonBlock,
  //wsUserOp,
  utf8ToHex,
  web3AnchorAddress,
  wsClient,
  wsSubscribe,
} from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { ImageUploadForm } from "../common/image-upload-form";
import { LanguageSelect } from "../common/language-select";
import { ListingTypeSelect } from "../common/listing-type-select";
import { MarkdownTextArea } from "../common/markdown-textarea";
import { SortSelect } from "../common/sort-select";
import { CommunityLink } from "../community/community-link";
import { PersonListing } from "./person-listing";

var Choices: any;
if (isBrowser()) {
  Choices = require("choices.js");
}

interface SettingsState {
  // TODO redo these forms
  saveUserSettingsForm: {
    show_nsfw?: boolean;
    theme?: string;
    default_sort_type?: number;
    default_listing_type?: number;
    interface_language?: string;
    avatar?: string;
    banner?: string;
    display_name?: string;
    email?: string;
    bio?: string;
    matrix_user_id?: string;
    show_avatars?: boolean;
    show_scores?: boolean;
    send_notifications_to_email?: boolean;
    bot_account?: boolean;
    show_bot_accounts?: boolean;
    show_read_posts?: boolean;
    show_new_post_notifs?: boolean;
    discussion_languages?: number[];
    web3_address?: string;
    pi_address?: string;
  };
  changePasswordForm: {
    new_password?: string;
    new_password_verify?: string;
    old_password?: string;
  };
  balanceState: {
    deposited?: number;
    spent?: number;
    received?: number;
    withdrawed?: number;
    amount?: number;
  };
  deleteAccountForm: {
    password?: string;
  };
  personBlocks: PersonBlockView[];
  blockPerson?: PersonViewSafe;
  communityBlocks: CommunityBlockView[];
  blockCommunityId: string;
  blockCommunity?: CommunityView;
  currentTab: string;
  themeList: string[];
  saveUserSettingsLoading: boolean;
  changePasswordLoading: boolean;
  deleteAccountLoading: boolean;
  deleteAccountShowConfirm: boolean;
  withdrawLoading: boolean;
  depositLoading: boolean;
  withdrawValue: number;
  depositValue: number;
  depositName?: string;
  sendPaymentValue?: string;
  siteRes: GetSiteResponse;
}

export class Settings extends Component<any, SettingsState> {
  private isoData = setIsoData(this.context);
  private blockPersonChoices: any;
  private blockCommunityChoices: any;
  private subscription?: Subscription;
  state: SettingsState = {
    saveUserSettingsForm: {},
    changePasswordForm: {},
    saveUserSettingsLoading: false,
    changePasswordLoading: false,
    deleteAccountLoading: false,
    deleteAccountShowConfirm: false,
    withdrawLoading: false,
    withdrawValue: 0.0,
    depositLoading: false,
    depositValue: 0.0,
    sendPaymentValue: undefined,
    depositName: undefined,
    balanceState: {},
    deleteAccountForm: {},
    personBlocks: [],
    communityBlocks: [],
    blockCommunityId: "",
    currentTab: "settings",
    siteRes: this.isoData.site_res,
    themeList: [],
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleSortTypeChange = this.handleSortTypeChange.bind(this);
    this.handleListingTypeChange = this.handleListingTypeChange.bind(this);
    this.handleBioChange = this.handleBioChange.bind(this);
    this.handleDiscussionLanguageChange =
      this.handleDiscussionLanguageChange.bind(this);

    this.handleAvatarUpload = this.handleAvatarUpload.bind(this);
    this.handleAvatarRemove = this.handleAvatarRemove.bind(this);

    this.handleBannerUpload = this.handleBannerUpload.bind(this);
    this.handleBannerRemove = this.handleBannerRemove.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    let mui = UserService.Instance.myUserInfo;
    if (mui) {
      let luv = mui.local_user_view;
      this.state = {
        ...this.state,
        personBlocks: mui.person_blocks,
        communityBlocks: mui.community_blocks,
        saveUserSettingsForm: {
          ...this.state.saveUserSettingsForm,
          show_nsfw: luv.local_user.show_nsfw,
          theme: luv.local_user.theme ? luv.local_user.theme : "browser",
          default_sort_type: luv.local_user.default_sort_type,
          default_listing_type: luv.local_user.default_listing_type,
          interface_language: luv.local_user.interface_language,
          discussion_languages: mui.discussion_languages,
          avatar: luv.person.avatar,
          banner: luv.person.banner,
          display_name: luv.person.display_name,
          show_avatars: luv.local_user.show_avatars,
          bot_account: luv.person.bot_account,
          show_bot_accounts: luv.local_user.show_bot_accounts,
          show_scores: luv.local_user.show_scores,
          show_read_posts: luv.local_user.show_read_posts,
          show_new_post_notifs: luv.local_user.show_new_post_notifs,
          email: luv.local_user.email,
          bio: luv.person.bio,
          send_notifications_to_email:
            luv.local_user.send_notifications_to_email,
          matrix_user_id: luv.person.matrix_user_id,
          web3_address: luv.person.web3_address,
          pi_address: luv.person.pi_address,
        },
      };
    }
  }

  async componentDidMount() {
    setupTippy();
    this.setState({ themeList: await fetchThemeList() });
    this.handlePiBalanceSubmit();
  }

  componentWillUnmount() {
    this.subscription?.unsubscribe();
  }

  get documentTitle(): string {
    return i18n.t("settings");
  }

  render() {
    return (
      <div className="container-lg">
        <>
          <HtmlTags
            title={this.documentTitle}
            path={this.context.router.route.match.url}
            description={this.documentTitle}
            image={this.state.saveUserSettingsForm.avatar}
          />
          <ul className="nav nav-tabs mb-2">
            <li className="nav-item">
              <button
                className={`nav-link btn ${
                  this.state.currentTab == "settings" && "active"
                }`}
                onClick={linkEvent(
                  { ctx: this, tab: "settings" },
                  this.handleSwitchTab
                )}
              >
                {i18n.t("settings")}
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link btn ${
                  this.state.currentTab == "blocks" && "active"
                }`}
                onClick={linkEvent(
                  { ctx: this, tab: "blocks" },
                  this.handleSwitchTab
                )}
              >
                {i18n.t("blocks")}
              </button>
            </li>
          </ul>
          {this.state.currentTab == "settings" && this.userSettings()}
          {this.state.currentTab == "blocks" && this.blockCards()}
        </>
      </div>
    );
  }

  userSettings() {
    return (
      <div className="row">
        <div className="col-12 col-md-6">
          <div className="card border-secondary mb-3">
            <div className="card-body">{this.saveUserSettingsHtmlForm()}</div>
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div className="card border-secondary mb-3">
            <div className="card-body">{this.balanceHtmlForm()}</div>
          </div>

          <div className="card border-secondary mb-3">
            <div className="card-body">{this.depositHtmlForm()}</div>
          </div>
          {amAdmin() && (
            <div className="card border-secondary mb-3">
              <div className="card-body">{this.sendPaymentHtmlForm()}</div>
            </div>
          )}
          <div className="card border-secondary mb-3">
            <div className="card-body">{this.changePasswordHtmlForm()}</div>
          </div>
        </div>
      </div>
    );
  }

  blockCards() {
    return (
      <div className="row">
        <div className="col-12 col-md-6">
          <div className="card border-secondary mb-3">
            <div className="card-body">{this.blockUserCard()}</div>
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div className="card border-secondary mb-3">
            <div className="card-body">{this.blockCommunityCard()}</div>
          </div>
        </div>
      </div>
    );
  }

  depositHtmlForm() {
    return (
      <>
        <h5>{i18n.t("Send to")}</h5>
        <form>
          <div className="form-group row">
            <label
              className="col-sm-5 col-form-label"
              htmlFor="user-deposit-name"
            >
              {i18n.t("Username")}
            </label>
            <div className="col-sm-7">
              <input
                type="text"
                id="user-deposit-name"
                className="form-control"
                value={this.state.depositName}
                //autoComplete="new-password"
                maxLength={60}
                onInput={linkEvent(this, this.handleDepositNameChange)}
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-5 col-form-label" htmlFor="user-deposit">
              {i18n.t("Amount")}
            </label>
            <div className="col-sm-7">
              <input
                type="text"
                id="user-deposit"
                className="form-control"
                value={this.state.depositValue}
                //autoComplete="new-password"
                maxLength={60}
                onInput={linkEvent(this, this.handleDepositChange)}
              />
            </div>
          </div>
          {!this.isPiBrowser && (
            <div className="form-group">
              <button
                type="button"
                className="btn btn-block btn-secondary mr-4"
                //onClick={linkEvent(this, this.handlePiDeposit)}
                disabled={true}
              >
                {this.state.depositLoading ? (
                  <Spinner />
                ) : (
                  capitalizeFirstLetter(i18n.t("Send"))
                )}
              </button>
            </div>
          )}
          {this.isPiBrowser && (
            <div className="form-group">
              <button
                type="button"
                className="btn btn-block btn-secondary mr-4"
                onClick={linkEvent(this, this.handlePiReward)}
              >
                {this.state.depositLoading ? (
                  <Spinner />
                ) : (
                  capitalizeFirstLetter(i18n.t("Send"))
                )}
              </button>
            </div>
          )}
        </form>
      </>
    );
  }
  sendPaymentHtmlForm() {
    return (
      <>
        <h5>{i18n.t("Send Payment")}</h5>
        <form onSubmit={linkEvent(this, this.handleChangePasswordSubmit)}>
          <div className="form-group row">
            <label
              className="col-sm-5 col-form-label"
              htmlFor="user-send-payment"
            >
              {i18n.t("PaymentId")}
            </label>
            <div className="col-sm-7">
              <input
                type="text"
                id="user-send-payment"
                className="form-control"
                value={this.state.sendPaymentValue}
                //autoComplete="new-password"
                maxLength={60}
                onInput={linkEvent(this, this.handleSendPaymentChange)}
              />
            </div>
          </div>
          {
            <div className="form-group">
              <button
                type="button"
                className="btn btn-block btn-secondary mr-4"
                onClick={linkEvent(this, this.handleSendPaymentSubmit)}
              >
                {this.state.depositLoading ? (
                  <Spinner />
                ) : (
                  capitalizeFirstLetter(i18n.t("Pay (Admin only)"))
                )}
              </button>
            </div>
          }
        </form>
      </>
    );
  }

  balanceHtmlForm() {
    return (
      <>
        <h5>{i18n.t("Balance statistics")}</h5>
        <form>
          <div className="form-group row">
            <label className="col-sm-5 col-form-label" htmlFor="user-spent">
              {i18n.t("Spent")}
            </label>
            <div className="col-sm-7">
              <input
                readOnly={true}
                type="text"
                id="user-spent"
                className="form-control"
                //value={1.0}
                value={this.state.balanceState.spent}
                //autoComplete="new-password"
                maxLength={60}
                //onInput={linkEvent(this, this.handleNewPasswordChange)}
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-5 col-form-label" htmlFor="user-received">
              {i18n.t("Received")}
            </label>
            <div className="col-sm-7">
              <input
                readOnly={true}
                type="text"
                id="user-received"
                className="form-control"
                //value={1.0}
                value={this.state.balanceState.received}
                //autoComplete="new-password"
                maxLength={60}
                //onInput={linkEvent(this, this.handleNewPasswordChange)}
              />
            </div>
          </div>
          <div className="form-group row">
            <label
              className="col-sm-5 col-form-label"
              htmlFor="user-withdrawed"
            >
              {i18n.t("Withdrawed")}
            </label>
            <div className="col-sm-7">
              <input
                type="text"
                id="user-withdrawed"
                className="form-control"
                readOnly={true}
                value={this.state.balanceState.withdrawed}
                //autoComplete="new-password"
                maxLength={60}
                //onInput={linkEvent(this, this.handleNewPasswordVerifyChange)}
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-5 col-form-label" htmlFor="user-amount">
              {i18n.t("Amount")}
            </label>
            <div className="col-sm-7">
              <input
                readOnly={true}
                type="text"
                id="user-amount"
                className="form-control"
                value={this.state.balanceState.amount}
                //autoComplete="new-password"
                maxLength={60}
                //onInput={linkEvent(this, this.handleNewPasswordChange)}
              />
            </div>
          </div>
          {
            <div className="form-group">
              <button
                type="button"
                className="btn btn-block btn-secondary mr-4"
                onClick={linkEvent(this, this.handlePiBalanceSubmit)}
              >
                {this.state.withdrawLoading ? (
                  <Spinner />
                ) : (
                  capitalizeFirstLetter(i18n.t("Balance"))
                )}
              </button>
            </div>
          }
          <div className="form-group row">
            <label className="col-sm-5 col-form-label" htmlFor="user-withdraw">
              {i18n.t("Withdraw Amount")}
            </label>
            <div className="col-sm-7">
              <input
                type="text"
                id="user-withdraw"
                className="form-control"
                value={this.state.withdrawValue}
                //value={this.state.changePasswordForm.new_password_verify}
                //autoComplete="new-password"
                maxLength={60}
                onInput={linkEvent(this, this.handleWithdrawChange)}
              />
            </div>
          </div>
          {
            <div className="form-group">
              <button
                type="button"
                className="btn btn-block btn-secondary mr-4"
                onClick={linkEvent(this, this.handlePiWithdrawSubmit)}
              >
                {this.state.withdrawLoading ? (
                  <Spinner />
                ) : (
                  capitalizeFirstLetter(i18n.t("Withdraw"))
                )}
              </button>
            </div>
          }
        </form>
      </>
    );
  }

  changePasswordHtmlForm() {
    return (
      <>
        <h5>{i18n.t("change_password")}</h5>
        <form onSubmit={linkEvent(this, this.handleChangePasswordSubmit)}>
          <div className="form-group row">
            <label className="col-sm-5 col-form-label" htmlFor="user-password">
              {i18n.t("new_password")}
            </label>
            <div className="col-sm-7">
              <input
                type="password"
                id="user-password"
                className="form-control"
                value={this.state.changePasswordForm.new_password}
                autoComplete="new-password"
                maxLength={60}
                onInput={linkEvent(this, this.handleNewPasswordChange)}
              />
            </div>
          </div>
          <div className="form-group row">
            <label
              className="col-sm-5 col-form-label"
              htmlFor="user-verify-password"
            >
              {i18n.t("verify_password")}
            </label>
            <div className="col-sm-7">
              <input
                type="password"
                id="user-verify-password"
                className="form-control"
                value={this.state.changePasswordForm.new_password_verify}
                autoComplete="new-password"
                maxLength={60}
                onInput={linkEvent(this, this.handleNewPasswordVerifyChange)}
              />
            </div>
          </div>
          {!this.isPiBrowser && (
            <div className="form-group row">
              <label
                className="col-sm-5 col-form-label"
                htmlFor="user-old-password"
              >
                {i18n.t("old_password")}
              </label>
              <div className="col-sm-7">
                <input
                  type="password"
                  id="user-old-password"
                  className="form-control"
                  value={this.state.changePasswordForm.old_password}
                  autoComplete="new-password"
                  maxLength={60}
                  onInput={linkEvent(this, this.handleOldPasswordChange)}
                />
              </div>
            </div>
          )}
          {!this.isPiBrowser && (
            <div className="form-group">
              <button
                type="submit"
                className="btn btn-block btn-secondary mr-4"
              >
                {this.state.changePasswordLoading ? (
                  <Spinner />
                ) : (
                  capitalizeFirstLetter(i18n.t("save"))
                )}
              </button>
            </div>
          )}
          {this.isPiBrowser && (
            <div className="form-group">
              <button
                type="button"
                className="btn btn-block btn-secondary mr-4"
                onClick={linkEvent(this, this.handlePiLoginSubmit)}
              >
                {this.state.changePasswordLoading ? (
                  <Spinner />
                ) : (
                  capitalizeFirstLetter(i18n.t("save"))
                )}
              </button>
            </div>
          )}
        </form>
      </>
    );
  }

  blockUserCard() {
    return (
      <div>
        {this.blockUserForm()}
        {this.blockedUsersList()}
      </div>
    );
  }

  blockedUsersList() {
    return (
      <>
        <h5>{i18n.t("blocked_users")}</h5>
        <ul className="list-unstyled mb-0">
          {this.state.personBlocks.map(pb => (
            <li key={pb.target.id}>
              <span>
                <PersonListing person={pb.target} />
                <button
                  className="btn btn-sm"
                  onClick={linkEvent(
                    { ctx: this, recipientId: pb.target.id },
                    this.handleUnblockPerson
                  )}
                  data-tippy-content={i18n.t("unblock_user")}
                >
                  <Icon icon="x" classes="icon-inline" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      </>
    );
  }

  blockUserForm() {
    let blockPerson = this.state.blockPerson;
    return (
      <div className="form-group row">
        <label
          className="col-md-4 col-form-label"
          htmlFor="block-person-filter"
        >
          {i18n.t("block_user")}
        </label>
        <div className="col-md-8">
          <select
            className="form-control"
            id="block-person-filter"
            value={blockPerson?.person.id ?? 0}
          >
            <option value="0">—</option>
            {blockPerson && (
              <option value={blockPerson.person.id}>
                {personSelectName(blockPerson)}
              </option>
            )}
          </select>
        </div>
      </div>
    );
  }

  blockCommunityCard() {
    return (
      <div>
        {this.blockCommunityForm()}
        {this.blockedCommunitiesList()}
      </div>
    );
  }

  blockedCommunitiesList() {
    return (
      <>
        <h5>{i18n.t("blocked_communities")}</h5>
        <ul className="list-unstyled mb-0">
          {this.state.communityBlocks.map(cb => (
            <li key={cb.community.id}>
              <span>
                <CommunityLink community={cb.community} />
                <button
                  className="btn btn-sm"
                  onClick={linkEvent(
                    { ctx: this, communityId: cb.community.id },
                    this.handleUnblockCommunity
                  )}
                  data-tippy-content={i18n.t("unblock_community")}
                >
                  <Icon icon="x" classes="icon-inline" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      </>
    );
  }

  blockCommunityForm() {
    return (
      <div className="form-group row">
        <label
          className="col-md-4 col-form-label"
          htmlFor="block-community-filter"
        >
          {i18n.t("block_community")}
        </label>
        <div className="col-md-8">
          <select
            className="form-control"
            id="block-community-filter"
            value={this.state.blockCommunityId}
          >
            <option value="0">—</option>
            {this.state.blockCommunity && (
              <option value={this.state.blockCommunity.community.id}>
                {communitySelectName(this.state.blockCommunity)}
              </option>
            )}
          </select>
        </div>
      </div>
    );
  }

  saveUserSettingsHtmlForm() {
    let selectedLangs = this.state.saveUserSettingsForm.discussion_languages;
    let getUser = UserService.Instance.myUserInfo;
    let verified = false;
    if (getUser?.local_user_view.person.verified == true) {
      verified = true;
    }
    return (
      <>
        <h5>{i18n.t("settings")}</h5>
        <form onSubmit={linkEvent(this, this.handleSaveSettingsSubmit)}>
          <div className="form-group row">
            <label className="col-sm-5 col-form-label" htmlFor="display-name">
              {i18n.t("display_name")}
            </label>
            <div className="col-sm-7">
              <input
                id="display-name"
                type="text"
                className="form-control"
                placeholder={i18n.t("optional")}
                value={this.state.saveUserSettingsForm.display_name}
                onInput={linkEvent(this, this.handleDisplayNameChange)}
                pattern="^(?!@)(.+)$"
                minLength={3}
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="user-bio">
              {i18n.t("bio")}
            </label>
            <div className="col-sm-9">
              <MarkdownTextArea
                initialContent={this.state.saveUserSettingsForm.bio}
                onContentChange={this.handleBioChange}
                maxLength={300}
                hideNavigationWarnings
                allLanguages={this.state.siteRes.all_languages}
                siteLanguages={this.state.siteRes.discussion_languages}
              />
            </div>
          </div>

          {/*<div class="form-group row">
            <label class="col-sm-3 col-form-label" htmlFor="user-email">
              {i18n.t("email")}
            </label>
            <div className="col-sm-9">
              <input
                type="email"
                id="user-email"
                className="form-control"
                placeholder={i18n.t("optional")}
                value={this.state.saveUserSettingsForm.email}
                onInput={linkEvent(this, this.handleEmailChange)}
                minLength={3}
              />
            </div>
          </div>*/}
          <div className="form-group row">
            <label
              className="col-lg-3 col-form-label"
              htmlFor="user-pi-address"
            >
              Pi Network Address
            </label>
            <div className="col-lg-9">
              <input
                type="text"
                id="user-pi-address"
                className="form-control"
                placeholder="Pi Network Address ( G... )"
                value={this.state.saveUserSettingsForm.pi_address}
                onInput={linkEvent(this, this.handlePiAddressChange)}
                pattern="^G[A-Za-z0-9]*$"
                minLength={3}
              />
            </div>
          </div>
          <div className="form-group row">
            <label
              className="col-lg-3 col-form-label"
              htmlFor="user-web3-address"
            >
              Web3 Address
            </label>
            <div className="col-lg-9">
              <input
                type="text"
                id="user-web3-address"
                className="form-control"
                placeholder={
                  "ETH, BSC, MATIC address ( 0x7ab111c7846b10e06963b2e6484a2462dc5851aa )"
                }
                value={this.state.saveUserSettingsForm.web3_address}
                onInput={linkEvent(this, this.handleWeb3AddresslChange)}
                pattern="^0x[a-fA-F0-9]{40}$"
                minLength={3}
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-5 col-form-label" htmlFor="matrix-user-id">
              <a href={elementUrl} rel={relTags}>
                {i18n.t("matrix_user_id")}
              </a>
            </label>
            <div className="col-sm-7">
              <input
                id="matrix-user-id"
                type="text"
                className="form-control"
                placeholder="@user:example.com"
                value={this.state.saveUserSettingsForm.matrix_user_id}
                onInput={linkEvent(this, this.handleMatrixUserIdChange)}
                pattern="^@[A-Za-z0-9._=-]+:[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3">{i18n.t("avatar")}</label>
            <div className="col-sm-9">
              <ImageUploadForm
                uploadTitle={i18n.t("upload_avatar")}
                imageSrc={this.state.saveUserSettingsForm.avatar}
                onUpload={this.handleAvatarUpload}
                onRemove={this.handleAvatarRemove}
                rounded
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3">{i18n.t("banner")}</label>
            <div className="col-sm-9">
              <ImageUploadForm
                uploadTitle={i18n.t("upload_banner")}
                imageSrc={this.state.saveUserSettingsForm.banner}
                onUpload={this.handleBannerUpload}
                onRemove={this.handleBannerRemove}
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3" htmlFor="user-language">
              {i18n.t("interface_language")}
            </label>
            <div className="col-sm-9">
              <select
                id="user-language"
                value={this.state.saveUserSettingsForm.interface_language}
                onChange={linkEvent(this, this.handleInterfaceLangChange)}
                className="custom-select w-auto"
              >
                <option disabled aria-hidden="true">
                  {i18n.t("interface_language")}
                </option>
                <option value="browser">{i18n.t("browser_default")}</option>
                <option disabled aria-hidden="true">
                  ──
                </option>
                {languages
                  .sort((a, b) => a.code.localeCompare(b.code))
                  .map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <LanguageSelect
            allLanguages={this.state.siteRes.all_languages}
            siteLanguages={this.state.siteRes.discussion_languages}
            selectedLanguageIds={selectedLangs}
            multiple={true}
            showSite
            onChange={this.handleDiscussionLanguageChange}
          />
          <div className="form-group row">
            <label className="col-sm-3" htmlFor="user-theme">
              {i18n.t("theme")}
            </label>
            <div className="col-sm-9">
              <select
                id="user-theme"
                value={this.state.saveUserSettingsForm.theme}
                onChange={linkEvent(this, this.handleThemeChange)}
                className="custom-select w-auto"
              >
                <option disabled aria-hidden="true">
                  {i18n.t("theme")}
                </option>
                <option value="browser">{i18n.t("browser_default")}</option>
                {this.state.themeList.map(theme => (
                  <option key={theme} value={theme}>
                    {theme}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <form className="form-group row">
            <label className="col-sm-3">{i18n.t("type")}</label>
            <div className="col-sm-9">
              <ListingTypeSelect
                type_={
                  Object.values(ListingType)[
                    this.state.saveUserSettingsForm.default_listing_type ?? 1
                  ]
                }
                showLocal={showLocal(this.isoData)}
                showSubscribed
                onChange={this.handleListingTypeChange}
              />
            </div>
          </form>
          <form className="form-group row">
            <label className="col-sm-3">{i18n.t("sort_type")}</label>
            <div className="col-sm-9">
              <SortSelect
                sort={
                  Object.values(SortType)[
                    this.state.saveUserSettingsForm.default_sort_type ?? 0
                  ]
                }
                onChange={this.handleSortTypeChange}
              />
            </div>
          </form>
          {enableNsfw(this.state.siteRes) && (
            <div className="form-group">
              <div className="form-check">
                <input
                  className="form-check-input"
                  id="user-show-nsfw"
                  type="checkbox"
                  checked={this.state.saveUserSettingsForm.show_nsfw}
                  onChange={linkEvent(this, this.handleShowNsfwChange)}
                />
                <label className="form-check-label" htmlFor="user-show-nsfw">
                  {i18n.t("show_nsfw")}
                </label>
              </div>
            </div>
          )}
          <div className="form-group">
            <div className="form-check">
              <input
                className="form-check-input"
                id="user-show-scores"
                type="checkbox"
                checked={this.state.saveUserSettingsForm.show_scores}
                onChange={linkEvent(this, this.handleShowScoresChange)}
              />
              <label className="form-check-label" htmlFor="user-show-scores">
                {i18n.t("show_scores")}
              </label>
            </div>
          </div>
          <div className="form-group">
            <div className="form-check">
              <input
                className="form-check-input"
                id="user-show-avatars"
                type="checkbox"
                checked={this.state.saveUserSettingsForm.show_avatars}
                onChange={linkEvent(this, this.handleShowAvatarsChange)}
              />
              <label className="form-check-label" htmlFor="user-show-avatars">
                {i18n.t("show_avatars")}
              </label>
            </div>
          </div>
          <div className="form-group">
            <div className="form-check">
              <input
                className="form-check-input"
                id="user-bot-account"
                type="checkbox"
                checked={this.state.saveUserSettingsForm.bot_account}
                onChange={linkEvent(this, this.handleBotAccount)}
              />
              <label className="form-check-label" htmlFor="user-bot-account">
                {i18n.t("bot_account")}
              </label>
            </div>
          </div>
          <div className="form-group">
            <div className="form-check">
              <input
                className="form-check-input"
                id="user-show-bot-accounts"
                type="checkbox"
                checked={this.state.saveUserSettingsForm.show_bot_accounts}
                onChange={linkEvent(this, this.handleShowBotAccounts)}
              />
              <label
                className="form-check-label"
                htmlFor="user-show-bot-accounts"
              >
                {i18n.t("show_bot_accounts")}
              </label>
            </div>
          </div>
          <div className="form-group">
            <div className="form-check">
              <input
                className="form-check-input"
                id="user-show-read-posts"
                type="checkbox"
                checked={this.state.saveUserSettingsForm.show_read_posts}
                onChange={linkEvent(this, this.handleReadPosts)}
              />
              <label
                className="form-check-label"
                htmlFor="user-show-read-posts"
              >
                {i18n.t("show_read_posts")}
              </label>
            </div>
          </div>
          <div className="form-group">
            <div className="form-check">
              <input
                className="form-check-input"
                id="user-show-new-post-notifs"
                type="checkbox"
                checked={this.state.saveUserSettingsForm.show_new_post_notifs}
                onChange={linkEvent(this, this.handleShowNewPostNotifs)}
              />
              <label
                className="form-check-label"
                htmlFor="user-show-new-post-notifs"
              >
                {i18n.t("show_new_post_notifs")}
              </label>
            </div>
          </div>
          <div className="form-group">
            <div className="form-check">
              <input
                className="form-check-input"
                id="user-send-notifications-to-email"
                type="checkbox"
                disabled={!this.state.saveUserSettingsForm.email}
                checked={
                  this.state.saveUserSettingsForm.send_notifications_to_email
                }
                onChange={linkEvent(
                  this,
                  this.handleSendNotificationsToEmailChange
                )}
              />
              <label
                className="form-check-label"
                htmlFor="user-send-notifications-to-email"
              >
                {i18n.t("send_notifications_to_email")}
              </label>
            </div>
          </div>
          <div className="form-group">
            <button type="submit" className="btn btn-block btn-secondary mr-4">
              {this.state.saveUserSettingsLoading ? (
                <Spinner />
              ) : (
                capitalizeFirstLetter(i18n.t("save"))
              )}
            </button>
          </div>
          <hr />
          {/* Create User's Community */}
          <div className="form-group">
            <button
              type="button"
              className="btn btn-block btn-secondary mr-4"
              onClick={linkEvent(this, this.handleCreateCommunitySubmit)}
            >
              Home
            </button>
          </div>
          <hr />

          {/* <div className="form-group">
            <button
              type="button"
              className="btn btn-block btn-secondary mr-4"
              onClick={linkEvent(this, this.handleGetPaymentSubmit)}
            >
              GetPayments
            </button>
          </div>
          <hr /> */}

          {!this.isPiBrowser && (
            <div className="form-group">
              <button
                type="button"
                className="btn btn-block btn-secondary mr-4"
                onClick={linkEvent(this, this.handleBlockchain)}
              >
                Mint NFT
              </button>
            </div>
          )}
          {!this.isPiBrowser && <hr />}

          {this.isPiBrowser && (
            <div className="form-group">
              <button
                type="button"
                className="btn btn-block btn-secondary mr-4"
                onClick={linkEvent(this, this.handlePiBlockchain)}
              >
                {!verified && i18n.t("Verify Pi Account")}
                {verified && i18n.t("Blockchain")}
              </button>
            </div>
          )}
          {this.isPiBrowser && !verified && <hr />}
          <div className="form-group">
            <button
              className="btn btn-block btn-danger"
              onClick={linkEvent(
                this,
                this.handleDeleteAccountShowConfirmToggle
              )}
            >
              {i18n.t("delete_account")}
            </button>
            {this.state.deleteAccountShowConfirm && (
              <>
                <div className="my-2 alert alert-danger" role="alert">
                  {i18n.t("delete_account_confirm")}
                </div>
                <input
                  type="password"
                  value={this.state.deleteAccountForm.password}
                  autoComplete="new-password"
                  maxLength={60}
                  onInput={linkEvent(
                    this,
                    this.handleDeleteAccountPasswordChange
                  )}
                  className="form-control my-2"
                />
                <button
                  className="btn btn-danger mr-4"
                  disabled={!this.state.deleteAccountForm.password}
                  onClick={linkEvent(this, this.handleDeleteAccount)}
                >
                  {this.state.deleteAccountLoading ? (
                    <Spinner />
                  ) : (
                    capitalizeFirstLetter(i18n.t("delete"))
                  )}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={linkEvent(
                    this,
                    this.handleDeleteAccountShowConfirmToggle
                  )}
                >
                  {i18n.t("cancel")}
                </button>
              </>
            )}
          </div>
        </form>
      </>
    );
  }

  get isPiBrowser(): boolean {
    return isBrowser() && navigator.userAgent.includes("PiBrowser");
  }

  setupBlockPersonChoices() {
    if (isBrowser()) {
      let selectId: any = document.getElementById("block-person-filter");
      if (selectId) {
        this.blockPersonChoices = new Choices(selectId, choicesConfig);
        this.blockPersonChoices.passedElement.element.addEventListener(
          "choice",
          (e: any) => {
            this.handleBlockPerson(e.detail.choice.value);
          },
          false
        );
        this.blockPersonChoices.passedElement.element.addEventListener(
          "search",
          debounce(async (e: any) => {
            try {
              let persons = (await fetchUsers(e.detail.value)).users;
              let choices = persons.map(pvs => personToChoice(pvs));
              this.blockPersonChoices.setChoices(
                choices,
                "value",
                "label",
                true
              );
            } catch (err) {
              console.error(err);
            }
          }),
          false
        );
      }
    }
  }

  setupBlockCommunityChoices() {
    if (isBrowser()) {
      let selectId: any = document.getElementById("block-community-filter");
      if (selectId) {
        this.blockCommunityChoices = new Choices(selectId, choicesConfig);
        this.blockCommunityChoices.passedElement.element.addEventListener(
          "choice",
          (e: any) => {
            this.handleBlockCommunity(e.detail.choice.value);
          },
          false
        );
        this.blockCommunityChoices.passedElement.element.addEventListener(
          "search",
          debounce(async (e: any) => {
            try {
              let communities = (await fetchCommunities(e.detail.value))
                .communities;
              let choices = communities.map(cv => communityToChoice(cv));
              this.blockCommunityChoices.setChoices(
                choices,
                "value",
                "label",
                true
              );
            } catch (err) {
              console.log(err);
            }
          }),
          false
        );
      }
    }
  }

  handleBlockPerson(personId: string) {
    let auth = myAuth();
    if (auth && personId.length !== 0) {
      let blockUserForm: BlockPerson = {
        person_id: personId,
        block: true,
        auth,
      };
      WebSocketService.Instance.send(wsClient.blockPerson(blockUserForm));
    }
  }

  handleUnblockPerson(i: { ctx: Settings; recipientId: string }) {
    let auth = myAuth();
    if (auth) {
      let blockUserForm: BlockPerson = {
        person_id: i.recipientId,
        block: false,
        auth,
      };
      WebSocketService.Instance.send(wsClient.blockPerson(blockUserForm));
    }
  }
  // Create user's community
  handleCreateCommunitySubmit() {
    let getUser = UserService.Instance.myUserInfo;
    if (getUser?.local_user_view.person.home == undefined) {
      let auth = myAuth();
      if (getUser && auth) {
        let formUserHome: CreateCommunity = {
          name: getUser.local_user_view.person.name,
          title:
            getUser.local_user_view.person.display_name ||
            getUser.local_user_view.person.name,
          auth: auth,
        };
        WebSocketService.Instance.send(wsClient.createCommunity(formUserHome));
      }
    } else {
      //this.props.history.push(`/c/${getUser?.local_user_view.person.name}`);
      //location.reload();
      window.location.href = `/c/${getUser?.local_user_view.person.name}`;
    }
  }

  handlePiBalanceSubmit() {
    let getUser = UserService.Instance.myUserInfo;
    let auth = myAuth(true);
    if (getUser && auth) {
      let formCheckBalance: GetPiBalances = {
        domain: window.location.hostname,
        asset: "PI",
        auth: auth,
      };
      WebSocketService.Instance.send(wsClient.piBalances(formCheckBalance));
    }
  }

  async handlePiWithdrawSubmit(i: Settings, event: any) {
    if (!i.isPiBrowser) {
      toast("Only allow withraw within Pi Browser");
      return;
    }
    let getUser = UserService.Instance.myUserInfo;
    let auth = myAuth(true);
    if (getUser && auth) {
      var piUser;

      const authenticatePiUser = async () => {
        // Identify the user with their username / unique network-wide ID, and get permission to request payments from them.
        const scopes = ["username", "payments", "wallet_address"];
        try {
          var user = await window.Pi.authenticate(
            scopes,
            onIncompletePaymentFound
          );
          return user;
        } catch (err) {
          console.log(err);
        }
      };

      const onIncompletePaymentFound = async payment => {
        //do something with incompleted payment
        var found = new PiPaymentFound();
        found.domain = window.location.hostname;
        found.paymentid = payment.identifier;
        found.pi_username = piUser.user.username;
        found.pi_uid = piUser.user.uid;
        found.pi_token = piUser.accessToken;
        found.auth = undefined;
        payment.metadata = undefined;
        found.dto = payment;
        //WebSocketService.Instance.send(wsClient.piPaymentFound(found));
        return;
      }; // Read more about this in the SDK reference
      piUser = await authenticatePiUser();
      if (piUser == undefined) {
        toast("Pi Network Server error");
        return;
      }
      let form: PiWithdraw = {
        pi_token: piUser.accessToken,
        domain: window.location.hostname,
        asset: "PI",
        amount: Number(i.state.withdrawValue),
        auth: auth,
      };
      WebSocketService.Instance.send(wsClient.piWithdraw(form));
    }
  }

  handleCreatePaymentSubmit(i: Settings, event: any) {
    let getUser = UserService.Instance.myUserInfo;
    let auth = myAuth(true);
    if (getUser && auth) {
      let form: CreatePayment = {
        domain: window.location.hostname,
        obj_cat: "withdraw",
        //obj_id: string;
        //ref_id: string;
        comment: "",

        //person_id?: None;
        //person_name?: string;
        //step?: number;
        //a2u: 0,
        //pending?: boolean;
        //page?: number;
        //limit: 100,
        //domain: window.location.hostname,
        amount: Number(i.state.depositValue),
        asset: "PI",
        auth: auth,
      };
      WebSocketService.Instance.send(wsClient.piCreatePayment(form));
    }
  }

  handleSendPaymentSubmit(i: Settings, event: any) {
    let getUser = UserService.Instance.myUserInfo;
    let auth = myAuth(true);
    if (getUser && auth) {
      let form: SendPayment = {
        id: i.state.sendPaymentValue,
        auth: auth,
      };
      WebSocketService.Instance.send(wsClient.piSendPayment(form));
    }
  }

  handleGetPaymentSubmit() {
    let getUser = UserService.Instance.myUserInfo;
    let auth = myAuth(true);
    if (getUser && auth) {
      let form: GetPayments = {
        person_id: getUser.local_user_view.person.id,
        //person_name?: string;
        //step?: number;
        //a2u: 0,
        //pending?: boolean;
        //page?: number;
        limit: 100,
        //domain: window.location.hostname,
        //asset: "PI",
        auth: auth,
      };
      WebSocketService.Instance.send(wsClient.piGetPayments(form));
    }
  }

  handleBlockCommunity(community_id: string) {
    let auth = myAuth();
    if (auth && community_id.length !== 0) {
      let blockCommunityForm: BlockCommunity = {
        community_id,
        block: true,
        auth,
      };
      WebSocketService.Instance.send(
        wsClient.blockCommunity(blockCommunityForm)
      );
    }
  }

  handleUnblockCommunity(i: { ctx: Settings; communityId: string }) {
    let auth = myAuth();
    if (auth) {
      let blockCommunityForm: BlockCommunity = {
        community_id: i.communityId,
        block: false,
        auth,
      };
      WebSocketService.Instance.send(
        wsClient.blockCommunity(blockCommunityForm)
      );
    }
  }

  handleShowNsfwChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.show_nsfw = event.target.checked;
    i.setState(i.state);
  }

  handleShowAvatarsChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.show_avatars = event.target.checked;
    let mui = UserService.Instance.myUserInfo;
    if (mui) {
      mui.local_user_view.local_user.show_avatars = event.target.checked;
    }
    i.setState(i.state);
  }

  handleBotAccount(i: Settings, event: any) {
    i.state.saveUserSettingsForm.bot_account = event.target.checked;
    i.setState(i.state);
  }

  handleShowBotAccounts(i: Settings, event: any) {
    i.state.saveUserSettingsForm.show_bot_accounts = event.target.checked;
    i.setState(i.state);
  }

  handleReadPosts(i: Settings, event: any) {
    i.state.saveUserSettingsForm.show_read_posts = event.target.checked;
    i.setState(i.state);
  }

  handleShowNewPostNotifs(i: Settings, event: any) {
    i.state.saveUserSettingsForm.show_new_post_notifs = event.target.checked;
    i.setState(i.state);
  }

  handleShowScoresChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.show_scores = event.target.checked;
    let mui = UserService.Instance.myUserInfo;
    if (mui) {
      mui.local_user_view.local_user.show_scores = event.target.checked;
    }
    i.setState(i.state);
  }

  handleSendNotificationsToEmailChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.send_notifications_to_email =
      event.target.checked;
    i.setState(i.state);
  }

  handleThemeChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.theme = event.target.value;
    setTheme(event.target.value, true);
    i.setState(i.state);
  }

  handleInterfaceLangChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.interface_language = event.target.value;
    i18n.changeLanguage(
      getLanguages(i.state.saveUserSettingsForm.interface_language).at(0)
    );
    i.setState(i.state);
  }

  handleDiscussionLanguageChange(val: number[]) {
    this.setState(
      s => ((s.saveUserSettingsForm.discussion_languages = val), s)
    );
  }

  handleSortTypeChange(val: SortType) {
    this.setState(
      s => (
        (s.saveUserSettingsForm.default_sort_type =
          Object.keys(SortType).indexOf(val)),
        s
      )
    );
  }

  handleListingTypeChange(val: ListingType) {
    this.setState(
      s => (
        (s.saveUserSettingsForm.default_listing_type =
          Object.keys(ListingType).indexOf(val)),
        s
      )
    );
  }

  handleEmailChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.email = event.target.value;
    i.setState(i.state);
  }

  handlePiAddressChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.pi_address = event.target.value;
    i.setState(i.state);
  }

  handleWeb3AddresslChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.web3_address = event.target.value;
    i.setState(i.state);
  }

  handleBioChange(val: string) {
    this.setState(s => ((s.saveUserSettingsForm.bio = val), s));
  }

  handleAvatarUpload(url: string) {
    this.setState(s => ((s.saveUserSettingsForm.avatar = url), s));
  }

  handleAvatarRemove() {
    this.setState(s => ((s.saveUserSettingsForm.avatar = ""), s));
  }

  handleBannerUpload(url: string) {
    this.setState(s => ((s.saveUserSettingsForm.banner = url), s));
  }

  handleBannerRemove() {
    this.setState(s => ((s.saveUserSettingsForm.banner = ""), s));
  }

  handleDisplayNameChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.display_name = event.target.value;
    i.setState(i.state);
  }

  handleMatrixUserIdChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.matrix_user_id = event.target.value;
    i.setState(i.state);
  }

  handleNewPasswordChange(i: Settings, event: any) {
    i.state.changePasswordForm.new_password = event.target.value;
    if (i.state.changePasswordForm.new_password == "") {
      i.state.changePasswordForm.new_password = undefined;
    }
    i.setState(i.state);
  }

  handleNewPasswordVerifyChange(i: Settings, event: any) {
    i.state.changePasswordForm.new_password_verify = event.target.value;
    if (i.state.changePasswordForm.new_password_verify == "") {
      i.state.changePasswordForm.new_password_verify = undefined;
    }
    i.setState(i.state);
  }

  handleOldPasswordChange(i: Settings, event: any) {
    i.state.changePasswordForm.old_password = event.target.value;
    if (i.state.changePasswordForm.old_password == "") {
      i.state.changePasswordForm.old_password = undefined;
    }
    i.setState(i.state);
  }

  handleDepositChange(i: Settings, event: any) {
    i.state.depositValue = event.target.value;
    i.setState(i.state);
  }

  handleDepositNameChange(i: Settings, event: any) {
    i.state.depositName = event.target.value;
    i.setState(i.state);
  }

  handleSendPaymentChange(i: Settings, event: any) {
    i.state.sendPaymentValue = event.target.value;
    i.setState(i.state);
  }

  handleWithdrawChange(i: Settings, event: any) {
    i.state.withdrawValue = event.target.value;
    i.setState(i.state);
  }

  handleSaveSettingsSubmit(i: Settings, event: any) {
    if (event) event.preventDefault();
    i.setState({ saveUserSettingsLoading: true });
    let auth = myAuth();
    if (auth) {
      let form: SaveUserSettings = {
        ...i.state.saveUserSettingsForm,
        auth,
        sign_data: false,
      };
      WebSocketService.Instance.send(wsClient.saveUserSettings(form));
    }
  }

  handleChangePasswordSubmit(i: Settings, event: any) {
    if (i.isPiBrowser) {
      this.handlePiLoginSubmit(i, event);
    } else {
      if (event) event.preventDefault();
      i.setState({ changePasswordLoading: true });
      let auth = myAuth();
      let pForm = i.state.changePasswordForm;
      let new_password = pForm.new_password;
      let new_password_verify = pForm.new_password_verify;
      let old_password = pForm.old_password;
      if (auth && new_password && old_password && new_password_verify) {
        let form: ChangePassword = {
          new_password,
          new_password_verify,
          old_password,
          auth,
        };

        WebSocketService.Instance.send(wsClient.changePassword(form));
      }
    }
  }

  handleDeleteAccountShowConfirmToggle(i: Settings, event: any) {
    if (event) event.preventDefault();
    i.setState({ deleteAccountShowConfirm: !i.state.deleteAccountShowConfirm });
  }

  handleDeleteAccountPasswordChange(i: Settings, event: any) {
    i.state.deleteAccountForm.password = event.target.value;
    i.setState(i.state);
  }

  handleDeleteAccount(i: Settings, event: any) {
    if (event) event.preventDefault();
    i.setState({ deleteAccountLoading: true });
    let auth = myAuth();
    let password = i.state.deleteAccountForm.password;
    if (auth && password) {
      let form: DeleteAccount = {
        password,
        auth,
      };
      WebSocketService.Instance.send(wsClient.deleteAccount(form));
    }
  }

  handleSwitchTab(i: { ctx: Settings; tab: string }) {
    i.ctx.setState({ currentTab: i.tab });

    if (i.ctx.state.currentTab == "blocks") {
      i.ctx.setupBlockPersonChoices();
      i.ctx.setupBlockCommunityChoices();
    }
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      this.setState({
        saveUserSettingsLoading: false,
        changePasswordLoading: false,
        deleteAccountLoading: false,
      });
      toast(i18n.t(msg.error), "danger");
      return;
    } else if (op == UserOperation.SaveUserSettings) {
      let data = wsJsonToRes<LoginResponse>(msg);
      UserService.Instance.login(data);
      location.reload();
      this.setState({ saveUserSettingsLoading: false });
      toast(i18n.t("saved"));
      window.scrollTo(0, 0);
    } else if (op == UserOperation.ChangePassword) {
      let data = wsJsonToRes<LoginResponse>(msg);
      UserService.Instance.login(data);
      this.setState({ changePasswordLoading: false });
      window.scrollTo(0, 0);
      toast(i18n.t("password_changed"));
    } else if (op == UserOperation.DeleteAccount) {
      this.setState({
        deleteAccountLoading: false,
        deleteAccountShowConfirm: false,
      });
      UserService.Instance.logout();
      window.location.href = "/";
    } else if (op == UserOperation.BlockPerson) {
      let data = wsJsonToRes<BlockPersonResponse>(msg);
      updatePersonBlock(data);
      let mui = UserService.Instance.myUserInfo;
      if (mui) {
        this.setState({ personBlocks: mui.person_blocks });
      }
    } else if (op == UserOperation.BlockCommunity) {
      let data = wsJsonToRes<BlockCommunityResponse>(msg);
      updateCommunityBlock(data);
      let mui = UserService.Instance.myUserInfo;
      if (mui) {
        this.setState({ communityBlocks: mui.community_blocks });
      }
    } else if (op == UserOperation.PiLogin) {
      let data = wsJsonToRes<LoginResponse>(msg);
      UserService.Instance.login(data);
      this.setState({ changePasswordLoading: false });
      window.scrollTo(0, 0);
      toast(i18n.t("password_changed"));
    } else if (op == UserOperation.GetPiBalances) {
      let data = wsJsonToRes<GetPiBalancesResponse>(msg);
      this.setState({
        balanceState: {
          spent: data.spent,
          deposited: data.deposited,
          received: data.received,
          withdrawed: data.withdrawed,
          amount: data.amount,
        },
      });
      toast(i18n.t("Get balances success"));
    } else if (op == UserOperation.CreateCommunity) {
      let data = wsJsonToRes<CommunityResponse>(msg);
      window.location.href = `/c/${data.community_view.community.name}`;
    } else if (op == UserOperation.PiWithdraw) {
      let data = wsJsonToRes<PiWithdrawResponse>(msg);
      toast(i18n.t("Withdraw push to queue success!") + data.id);
    } else {
      this.setState({
        saveUserSettingsLoading: false,
        changePasswordLoading: false,
        deleteAccountLoading: false,
      });
    }
  }

  async handleBlockchain(i: Settings, event: any) {
    toast("Mint your's info as NFT is comming soon");
    if (i.isPiBrowser) return;
    if (!i.isPiBrowser) return;
    if (UserService.Instance.myUserInfo === undefined) return;
    if (UserService.Instance.myUserInfo === null) return;

    const isMetaMaskInstalled = () => {
      //Have to check the ethereum binding on the window object to see if it's installed
      const { ethereum } = window;
      return Boolean(ethereum && ethereum.isMetaMask);
    };
    let mui = UserService.Instance.myUserInfo;
    let luv = mui.local_user_view;

    var config = {
      memo: "person",
      metadata: {
        id: luv.person.id,
        name: luv.person.name,
        display: luv.person.display_name,
        actor_id: luv.person.actor_id,
        t: luv.person.published,
        u: luv.person.updated,
        s: luv.person.auth_sign,
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

  async handlePiLoginSubmit(i: Settings, event: any) {
    //if (!i.isPiBrowser)
    //  return;
    var piUser;
    let auth = myAuth(false);
    const authenticatePiUser = async () => {
      // Identify the user with their username / unique network-wide ID, and get permission to request payments from them.
      const scopes = ["username", "payments", "wallet_address"];
      try {
        var user = await window.Pi.authenticate(
          scopes,
          onIncompletePaymentFound
        );
        return user;
      } catch (err) {
        console.log(err);
      }
    };

    const onIncompletePaymentFound = async payment => {
      //do something with incompleted payment
      var found = new PiPaymentFound();
      found.domain = window.location.hostname;
      found.paymentid = payment.identifier;
      found.pi_username = piUser.user.username;
      found.pi_uid = piUser.user.uid;
      found.pi_token = piUser.accessToken;
      found.auth = auth;
      payment.metadata = undefined;
      found.dto = payment;
      WebSocketService.Instance.send(wsClient.piPaymentFound(found));
      return;
    }; // Read more about this in the SDK reference

    if (event) event.preventDefault();
    i.setState({ changePasswordLoading: true });
    piUser = await authenticatePiUser();
    var ea = new ExternalAccount();
    ea.account = piUser.user.username;
    ea.token = piUser.accessToken;
    ea.epoch = 0;
    ea.signature = piUser.user.uid;
    ea.provider = "PiNetwork";
    ea.extra = undefined;
    ea.uuid = piUser.user.uid;

    let form = new PiLogin();

    let username_or_email = ea.account;
    let password = i.state.changePasswordForm.new_password;

    form.domain = window.location.hostname;
    form.ea = ea;
    if (username_or_email && password) {
      let login: Login = {
        username_or_email,
        password,
      };
      form.info = login;
    }
    i.setState(i.state);
    WebSocketService.Instance.send(wsClient.piLogin(form));
  }

  async handlePiBlockchain(i: Settings, event: any) {
    if (UserService.Instance.myUserInfo) {
      let mui = UserService.Instance.myUserInfo;
      let luv = mui.local_user_view;
      var config = {
        amount: 0.001,
        memo: `Web3 person: ${luv.person.name} ${luv.person.display_name}`,
        metadata: {
          id: luv.person.id,
          cat: "person",
          data: { person: luv.person },
        },
      };
      try {
        let auth = myAuth(true);
        await createPayment(
          config,
          window.location.hostname,
          auth,
          "person",
          luv.person.id,
          luv.person.id,
          `profile ${luv.person.name} ${luv.person.display_name}`
        );
      } catch (err) {
        console.log("Error");
      }
    }
  }

  async handlePiDeposit(i: Settings, event: any) {
    if (UserService.Instance.myUserInfo) {
      let mui = UserService.Instance.myUserInfo;
      let luv = mui.local_user_view;
      var amnt = Number(i.state.depositValue);
      var config = {
        amount: amnt,
        //memo: "AD" + convertUUIDtoULID(luv.person.id),
        memo: `User ${luv.person.name} deposit ${amnt}`,
        metadata: {
          id: luv.person.id,
          cat: "deposit",
          data: { deposit: amnt },
        },
      };
      try {
        let auth = myAuth(true);
        await createPayment(
          config,
          window.location.hostname,
          auth,
          "deposit",
          luv.person.id,
          luv.person.id,
          `User ${luv.person.name} deposit ${amnt}`
        );
      } catch (err) {
        console.log(
          "Create Pi Payment Deposit for person error:" + JSON.stringify(err)
        );
      }
    }
  }
  async handlePiReward(i: Settings, event: any) {
    if (UserService.Instance.myUserInfo) {
      let mui = UserService.Instance.myUserInfo;
      let luv = mui.local_user_view;
      var amnt = Number(i.state.depositValue);
      var config = {
        amount: amnt,
        memo: `Reward ${i.state.depositName} ${amnt} π by ${luv.person.name}`,
        metadata: {
          id: luv.person.id,
          cat: "reward",
          data: {
            reward: {
              from: luv.person.name,
              to: i.state.depositName,
              amount: Number(i.state.depositValue),
            },
          },
        },
      };
      try {
        let auth = myAuth(true);
        await createPayment(
          config,
          window.location.hostname,
          auth,
          "reward",
          luv.person.id,
          undefined,
          `Reward ${i.state.depositName} ${amnt} π by ${luv.person.name}`
        );
      } catch (err) {
        console.log("Error");
      }
    }
  }
}
