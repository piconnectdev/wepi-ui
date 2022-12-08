import { None, Option, Some } from "@sniptt/monads";
import { Component, linkEvent } from "inferno";
import {
  BlockCommunity,
  BlockCommunityResponse,
  BlockPerson,
  BlockPersonResponse,
  ChangePassword,
  CommunityBlockView,
  CommunityView,
  DeleteAccount,
  ExternalAccount,
  GetSiteResponse,
  ListingType,
  Login,
  LoginResponse,
  PersonBlockView,
  PersonViewSafe,
  PiLogin,
  SaveUserSettings,
  SortType,
  toUndefined,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import axios from "../../axios";
import { i18n, languages } from "../../i18next";
import { UserService, WebSocketService } from "../../services";
import {
  auth,
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
  saveUserSettingsForm: SaveUserSettings;
  changePasswordForm: ChangePassword;
  deleteAccountForm: DeleteAccount;
  personBlocks: PersonBlockView[];
  blockPerson: Option<PersonViewSafe>;
  communityBlocks: CommunityBlockView[];
  blockCommunityId: string;
  blockCommunity?: CommunityView;
  currentTab: string;
  themeList: string[];
  saveUserSettingsLoading: boolean;
  changePasswordLoading: boolean;
  deleteAccountLoading: boolean;
  deleteAccountShowConfirm: boolean;
  siteRes: GetSiteResponse;
}

export class Settings extends Component<any, SettingsState> {
  private isoData = setIsoData(this.context);
  private blockPersonChoices: any;
  private blockCommunityChoices: any;
  private subscription: Subscription;
  private emptyState: SettingsState = {
    saveUserSettingsForm: new SaveUserSettings({
      show_nsfw: None,
      show_scores: None,
      show_avatars: None,
      show_read_posts: None,
      show_bot_accounts: None,
      show_new_post_notifs: None,
      default_sort_type: None,
      default_listing_type: None,
      theme: None,
      interface_language: None,
      discussion_languages: None,
      avatar: None,
      banner: None,
      display_name: None,
      email: None,
      bio: None,
      matrix_user_id: None,
      send_notifications_to_email: None,
      bot_account: None,
      auth: undefined,
      pi_address: None,
      web3_address: None,
      dap_address: None,
      cosmos_address: None,
      sui_address: None,
      ton_address: None,
      pol_address: None,
      auth_sign: None,
      sign_data: true,
    }),
    changePasswordForm: new ChangePassword({
      new_password: undefined,
      new_password_verify: undefined,
      old_password: undefined,
      auth: undefined,
    }),
    saveUserSettingsLoading: false,
    changePasswordLoading: false,
    deleteAccountLoading: false,
    deleteAccountShowConfirm: false,
    deleteAccountForm: new DeleteAccount({
      password: undefined,
      auth: undefined,
    }),
    personBlocks: [],
    blockPerson: None,
    communityBlocks: [],
    blockCommunityId: "",
    currentTab: "settings",
    siteRes: this.isoData.site_res,
    themeList: [],
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
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

    if (UserService.Instance.myUserInfo.isSome()) {
      let mui = UserService.Instance.myUserInfo.unwrap();
      let luv = mui.local_user_view;
      this.state = {
        ...this.state,
        personBlocks: mui.person_blocks,
        communityBlocks: mui.community_blocks,
        saveUserSettingsForm: {
          ...this.state.saveUserSettingsForm,
          show_nsfw: Some(luv.local_user.show_nsfw),
          theme: Some(luv.local_user.theme ? luv.local_user.theme : "browser"),
          default_sort_type: Some(luv.local_user.default_sort_type),
          default_listing_type: Some(luv.local_user.default_listing_type),
          interface_language: Some(luv.local_user.interface_language),
          discussion_languages: Some(mui.discussion_languages.map(l => l.id)),
          avatar: luv.person.avatar,
          banner: luv.person.banner,
          display_name: luv.person.display_name,
          show_avatars: Some(luv.local_user.show_avatars),
          bot_account: Some(luv.person.bot_account),
          show_bot_accounts: Some(luv.local_user.show_bot_accounts),
          show_scores: Some(luv.local_user.show_scores),
          show_read_posts: Some(luv.local_user.show_read_posts),
          show_new_post_notifs: Some(luv.local_user.show_new_post_notifs),
          email: luv.local_user.email,
          bio: luv.person.bio,
          send_notifications_to_email: Some(
            luv.local_user.send_notifications_to_email
          ),
          matrix_user_id: luv.person.matrix_user_id,
        },
      };
    }
  }

  async componentDidMount() {
    setupTippy();
    this.setState({ themeList: await fetchThemeList() });
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
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
            description={Some(this.documentTitle)}
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
          <div className="form-group">
            <button type="submit" className="btn btn-block btn-secondary mr-4">
              {this.state.changePasswordLoading ? (
                <Spinner />
              ) : (
                capitalizeFirstLetter(i18n.t("save"))
              )}
            </button>
          </div>
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
            value={this.state.blockPerson.map(p => p.person.id).unwrapOr(0)}
          >
            <option value="0">—</option>
            {this.state.blockPerson.match({
              some: personView => (
                <option value={personView.person.id}>
                  {personSelectName(personView)}
                </option>
              ),
              none: <></>,
            })}
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
                value={toUndefined(
                  this.state.saveUserSettingsForm.display_name
                )}
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
                initialLanguageId={None}
                onContentChange={this.handleBioChange}
                maxLength={Some(300)}
                placeholder={None}
                buttonTitle={None}
                hideNavigationWarnings
                allLanguages={this.state.siteRes.all_languages}
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
                value={toUndefined(this.state.saveUserSettingsForm.email)}
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
              {i18n.t("Pi Network Address")}
            </label>
            <div className="col-lg-9">
              <input
                type="text"
                id="user-pi-address"
                className="form-control"
                placeholder={i18n.t("Pi Network Address ( G... )")}
                value={toUndefined(this.state.saveUserSettingsForm.pi_address)}
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
              {i18n.t("Web3 Address")}
            </label>
            <div className="col-lg-9">
              <input
                type="text"
                id="user-web3-address"
                className="form-control"
                placeholder={i18n.t(
                  "ETH, BSC, MATIC address ( 0x7ab111c7846b10e06963b2e6484a2462dc5851aa )"
                )}
                value={toUndefined(
                  this.state.saveUserSettingsForm.web3_address
                )}
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
                value={toUndefined(
                  this.state.saveUserSettingsForm.matrix_user_id
                )}
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
                value={toUndefined(
                  this.state.saveUserSettingsForm.interface_language
                )}
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
            selectedLanguageIds={selectedLangs}
            multiple={true}
            onChange={this.handleDiscussionLanguageChange}
          />
          <div className="form-group row">
            <label className="col-sm-3" htmlFor="user-theme">
              {i18n.t("theme")}
            </label>
            <div className="col-sm-9">
              <select
                id="user-theme"
                value={toUndefined(this.state.saveUserSettingsForm.theme)}
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
                    this.state.saveUserSettingsForm.default_listing_type.unwrapOr(
                      1
                    )
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
                    this.state.saveUserSettingsForm.default_sort_type.unwrapOr(
                      0
                    )
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
                  checked={toUndefined(
                    this.state.saveUserSettingsForm.show_nsfw
                  )}
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
                checked={toUndefined(
                  this.state.saveUserSettingsForm.show_scores
                )}
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
                checked={toUndefined(
                  this.state.saveUserSettingsForm.show_avatars
                )}
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
                checked={toUndefined(
                  this.state.saveUserSettingsForm.bot_account
                )}
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
                checked={toUndefined(
                  this.state.saveUserSettingsForm.show_bot_accounts
                )}
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
                checked={toUndefined(
                  this.state.saveUserSettingsForm.show_read_posts
                )}
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
                checked={toUndefined(
                  this.state.saveUserSettingsForm.show_new_post_notifs
                )}
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
                checked={toUndefined(
                  this.state.saveUserSettingsForm.send_notifications_to_email
                )}
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
          {!this.isPiBrowser && (
            <div className="form-group">
              <button
                className="btn btn-block btn-secondary mr-4"
                onClick={linkEvent(this, this.handleBlockchain)}
              >
                {i18n.t("Blockchain")}
              </button>
            </div>
          )}
          <hr />
          {this.isPiBrowser && (
            <div className="form-group">
              <button
                className="btn btn-block btn-secondary mr-4"
                onClick={linkEvent(this, this.handlePiBlockchain)}
              >
                {i18n.t("Save to Pi Blockchain")}
              </button>
            </div>
          )}
          {this.isPiBrowser && <hr />}
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
    if (personId != null) {
      let blockUserForm = new BlockPerson({
        person_id: personId,
        block: true,
        auth: auth().unwrap(),
      });
      WebSocketService.Instance.send(wsClient.blockPerson(blockUserForm));
    }
  }

  handleUnblockPerson(i: { ctx: Settings; recipientId: string }) {
    let blockUserForm = new BlockPerson({
      person_id: i.recipientId,
      block: false,
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(wsClient.blockPerson(blockUserForm));
  }

  handleBlockCommunity(community_id: string) {
    if (community_id != null) {
      let blockCommunityForm = new BlockCommunity({
        community_id,
        block: true,
        auth: auth().unwrap(),
      });
      WebSocketService.Instance.send(
        wsClient.blockCommunity(blockCommunityForm)
      );
    }
  }

  handleUnblockCommunity(i: { ctx: Settings; communityId: string }) {
    let blockCommunityForm = new BlockCommunity({
      community_id: i.communityId,
      block: false,
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(wsClient.blockCommunity(blockCommunityForm));
  }

  handleShowNsfwChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.show_nsfw = Some(event.target.checked);
    i.setState(i.state);
  }

  handleShowAvatarsChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.show_avatars = Some(event.target.checked);
    UserService.Instance.myUserInfo.match({
      some: mui =>
        (mui.local_user_view.local_user.show_avatars = event.target.checked),
      none: void 0,
    });
    i.setState(i.state);
  }

  handleBotAccount(i: Settings, event: any) {
    i.state.saveUserSettingsForm.bot_account = Some(event.target.checked);
    i.setState(i.state);
  }

  handleShowBotAccounts(i: Settings, event: any) {
    i.state.saveUserSettingsForm.show_bot_accounts = Some(event.target.checked);
    i.setState(i.state);
  }

  handleReadPosts(i: Settings, event: any) {
    i.state.saveUserSettingsForm.show_read_posts = Some(event.target.checked);
    i.setState(i.state);
  }

  handleShowNewPostNotifs(i: Settings, event: any) {
    i.state.saveUserSettingsForm.show_new_post_notifs = Some(
      event.target.checked
    );
    i.setState(i.state);
  }

  handleShowScoresChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.show_scores = Some(event.target.checked);
    UserService.Instance.myUserInfo.match({
      some: mui =>
        (mui.local_user_view.local_user.show_scores = event.target.checked),
      none: void 0,
    });
    i.setState(i.state);
  }

  handleSendNotificationsToEmailChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.send_notifications_to_email = Some(
      event.target.checked
    );
    i.setState(i.state);
  }

  handleThemeChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.theme = Some(event.target.value);
    setTheme(event.target.value, true);
    i.setState(i.state);
  }

  handleInterfaceLangChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.interface_language = Some(event.target.value);
    i18n.changeLanguage(
      getLanguages(i.state.saveUserSettingsForm.interface_language.unwrap())[0]
    );
    i.setState(i.state);
  }

  handleDiscussionLanguageChange(val: number[]) {
    this.setState(
      s => ((s.saveUserSettingsForm.discussion_languages = Some(val)), s)
    );
  }

  handleSortTypeChange(val: SortType) {
    this.setState(
      s => (
        (s.saveUserSettingsForm.default_sort_type = Some(
          Object.keys(SortType).indexOf(val)
        )),
        s
      )
    );
  }

  handleListingTypeChange(val: ListingType) {
    this.setState(
      s => (
        (s.saveUserSettingsForm.default_listing_type = Some(
          Object.keys(ListingType).indexOf(val)
        )),
        s
      )
    );
  }

  handleEmailChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.email = Some(event.target.value);
    i.setState(i.state);
  }

  handlePiAddressChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.pi_address = Some(event.target.value);
    i.setState(i.state);
  }

  handleWeb3AddresslChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.web3_address = Some(event.target.value);
    i.setState(i.state);
  }

  handleBioChange(val: string) {
    this.setState(s => ((s.saveUserSettingsForm.bio = Some(val)), s));
  }

  handleAvatarUpload(url: string) {
    this.setState(s => ((s.saveUserSettingsForm.avatar = Some(url)), s));
  }

  handleAvatarRemove() {
    this.setState(s => ((s.saveUserSettingsForm.avatar = Some("")), s));
  }

  handleBannerUpload(url: string) {
    this.setState(s => ((s.saveUserSettingsForm.banner = Some(url)), s));
  }

  handleBannerRemove() {
    this.setState(s => ((s.saveUserSettingsForm.banner = Some("")), s));
  }

  handleDisplayNameChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.display_name = Some(event.target.value);
    i.setState(i.state);
  }

  handleMatrixUserIdChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.matrix_user_id = Some(event.target.value);
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

  handleSaveSettingsSubmit(i: Settings, event: any) {
    event.preventDefault();
    i.setState({ saveUserSettingsLoading: true });
    i.setState(s => ((s.saveUserSettingsForm.auth = auth().unwrap()), s));

    let form = new SaveUserSettings({ ...i.state.saveUserSettingsForm });
    WebSocketService.Instance.send(wsClient.saveUserSettings(form));
  }

  handleChangePasswordSubmit(i: Settings, event: any) {
    if (i.isPiBrowser) {
      this.handlePiLoginSubmit(i, event);
    } else {
      event.preventDefault();
      i.setState({ changePasswordLoading: true });
      i.setState(s => ((s.changePasswordForm.auth = auth().unwrap()), s));

      let form = new ChangePassword({ ...i.state.changePasswordForm });

      WebSocketService.Instance.send(wsClient.changePassword(form));
    }
  }

  handleDeleteAccountShowConfirmToggle(i: Settings, event: any) {
    event.preventDefault();
    i.setState({ deleteAccountShowConfirm: !i.state.deleteAccountShowConfirm });
  }

  handleDeleteAccountPasswordChange(i: Settings, event: any) {
    i.state.deleteAccountForm.password = event.target.value;
    i.setState(i.state);
  }

  handleDeleteAccount(i: Settings, event: any) {
    event.preventDefault();
    i.setState({ deleteAccountLoading: true });
    i.setState(s => ((s.deleteAccountForm.auth = auth().unwrap()), s));

    let form = new DeleteAccount({ ...i.state.deleteAccountForm });

    WebSocketService.Instance.send(wsClient.deleteAccount(form));
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
      let data = wsJsonToRes<LoginResponse>(msg, LoginResponse);
      UserService.Instance.login(data);
      location.reload();
      this.setState({ saveUserSettingsLoading: false });
      toast(i18n.t("saved"));
      window.scrollTo(0, 0);
    } else if (op == UserOperation.ChangePassword) {
      let data = wsJsonToRes<LoginResponse>(msg, LoginResponse);
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
      let data = wsJsonToRes<BlockPersonResponse>(msg, BlockPersonResponse);
      updatePersonBlock(data).match({
        some: blocks => this.setState({ personBlocks: blocks }),
        none: void 0,
      });
    } else if (op == UserOperation.BlockCommunity) {
      let data = wsJsonToRes<BlockCommunityResponse>(
        msg,
        BlockCommunityResponse
      );
      updateCommunityBlock(data).match({
        some: blocks => this.setState({ communityBlocks: blocks }),
        none: void 0,
      });
    } else {
      this.setState({
        saveUserSettingsLoading: false,
        changePasswordLoading: false,
        deleteAccountLoading: false,
      });
    }
  }

  async handleBlockchain(i: Settings, event: any) {
    // WebSocketService.Instance.send(wsClient.savePost(form));
    if (UserService.Instance.myUserInfo === undefined) return;
    if (UserService.Instance.myUserInfo === null) return;
    if (UserService.Instance.myUserInfo.local_user_view === undefined) return;

    const isMetaMaskInstalled = () => {
      //Have to check the ethereum binding on the window object to see if it's installed
      const { ethereum } = window;
      return Boolean(ethereum && ethereum.isMetaMask);
    };
    let mui = UserService.Instance.myUserInfo.unwrap();
    let luv = mui.local_user_view;

    var config = {
      memo: "wepi:profile:" + luv.person.name,
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

  /*
  handleChangePasswordSubmit(i: Settings, event: any) {
    event.preventDefault();
    i.setState({ changePasswordLoading: true });
    i.setState(s => ((s.changePasswordForm.auth = auth().unwrap()), s));

    let form = new ChangePassword({ ...i.state.changePasswordForm });

    WebSocketService.Instance.send(wsClient.changePassword(form));
  }
  */
  async handlePiLoginSubmit(i: Settings, event: any) {
    //if (!this.isPiBrowser)
    //  return;
    var piUser;

    const authenticatePiUser = async () => {
      // Identify the user with their username / unique network-wide ID, and get permission to request payments from them.
      const scopes = ["username", "payments"];
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
      const { data } = await axios.post("/pi/found", {
        paymentid: payment.identifier,
        pi_username: piUser.user.username,
        pi_uid: piUser.user.uid,
        auth: null,
        dto: null,
      });

      if (data.status >= 200 && data.status < 300) {
        //payment was approved continue with flow
        return data;
      }
    }; // Read more about this in the SDK reference

    // const PiLogin = async (form: PiLoginForm) => {
    //   let client = new LemmyHttp(httpBase);
    //   return client.piLogin(form);
    // };

    event.preventDefault();
    //i.setState({ loginLoading: true });
    i.setState({ changePasswordLoading: true });
    piUser = await authenticatePiUser();
    var ea = new ExternalAccount({
      account: piUser.user.username,
      token: piUser.accessToken,
      epoch: 0,
      signature: None,
      provider: Some("PiNetwork"),
      extra: None,
      uuid: Some(piUser.user.uid),
    });

    let form = new PiLogin({
      domain: Some(window.location.hostname),
      ea: ea,
      info: new Login({
        username_or_email: ea.account,
        password: i.state.changePasswordForm.new_password,
      }),
    });

    i.setState(i.state);
    // let useHttp = false;
    // if (useHttp === true) {
    //   console.log(JSON.stringify(i.state.piLoginForm));
    //   var data = await PiLogin(i.state.piLoginForm);
    //   //this.state = this.emptyState;
    //   this.setState(this.state);
    //   UserService.Instance.login(data);
    //   WebSocketService.Instance.send(
    //     wsClient.userJoin({
    //       auth: auth().unwrap(),
    //     })
    //   );
    //   toast(i18n.t("logged_in"));
    //   this.props.history.push("/");
    // }
    WebSocketService.Instance.send(wsClient.piLogin(form));
  }

  async handlePiBlockchain(i: Settings, event: any) {
    let mui = UserService.Instance.myUserInfo.unwrap();
    let luv = mui.local_user_view;
    var config = {
      amount: 0.001,
      //memo: ('wepi:profile:'+luv.person.name).substr(0,28),
      memo: "wepi:profile",
      metadata: {
        id: luv.person.id,
        name: luv.person.name,
        display: luv.person.display_name,
        actor_id: luv.person.actor_id,
        //pi_address: luv.person.pi_address,
        //web3_address: luv.person.web3_address,
        t: luv.person.published,
        u: luv.person.updated,
        s: luv.person.auth_sign,
      },
    };
    var info = {
      own: luv.person.id,
      comment: luv.person.name,
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
}
