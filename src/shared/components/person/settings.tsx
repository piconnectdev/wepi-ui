import { Component, linkEvent } from "inferno";
import ISO6391 from "iso-639-1";
import {
  BlockCommunity,
  BlockCommunityResponse,
  BlockPerson,
  BlockPersonResponse,
  ChangePassword,
  CommunityBlockView,
  CommunityView,
  DeleteAccount,
  GetSiteResponse,
  ListingType,
  LoginResponse,
  PersonBlockView,
  PersonViewSafe,
  SaveUserSettings,
  SortType,
  UserOperation,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { UserService, WebSocketService } from "../../services";
import {
  authField,
  capitalizeFirstLetter,
  choicesConfig,
  communitySelectName,
  communityToChoice,
  debounce,
  elementUrl,
  fetchCommunities,
  fetchUsers,
  getLanguage,
  isBrowser,
  languages,
  personSelectName,
  personToChoice,
  setIsoData,
  setTheme,
  setupTippy,
  showLocal,
  themes,
  toast,
  updateCommunityBlock,
  updatePersonBlock,
  wsClient,
  wsJsonToRes,
  wsSubscribe,
  wsUserOp,
  utf8ToHex,
  web3AnchorAddress,
  eth001,
  gasPrice,
} from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { ImageUploadForm } from "../common/image-upload-form";
import { ListingTypeSelect } from "../common/listing-type-select";
import { MarkdownTextArea } from "../common/markdown-textarea";
import { SortSelect } from "../common/sort-select";
import { CommunityLink } from "../community/community-link";
import { PersonListing } from "./person-listing";
import axios from '../../axios';

var Choices: any;
if (isBrowser()) {
  Choices = require("choices.js");
}

interface SettingsState {
  saveUserSettingsForm: SaveUserSettings;
  changePasswordForm: ChangePassword;
  saveUserSettingsLoading: boolean;
  changePasswordLoading: boolean;
  deleteAccountLoading: boolean;
  deleteAccountShowConfirm: boolean;
  deleteAccountForm: DeleteAccount;
  personBlocks: PersonBlockView[];
  blockPersonId: number;
  blockPerson?: PersonViewSafe;
  communityBlocks: CommunityBlockView[];
  blockCommunityId: number;
  blockCommunity?: CommunityView;
  currentTab: string;
  siteRes: GetSiteResponse;
}

export class Settings extends Component<any, SettingsState> {
  private isoData = setIsoData(this.context);
  private blockPersonChoices: any;
  private blockCommunityChoices: any;
  private subscription: Subscription;
  private emptyState: SettingsState = {
    saveUserSettingsForm: {
      auth: authField(false),
    },
    changePasswordForm: {
      new_password: null,
      new_password_verify: null,
      old_password: null,
      auth: authField(false),
    },
    saveUserSettingsLoading: null,
    changePasswordLoading: false,
    deleteAccountLoading: null,
    deleteAccountShowConfirm: false,
    deleteAccountForm: {
      password: null,
      auth: authField(false),
    },
    personBlocks: [],
    blockPersonId: 0,
    communityBlocks: [],
    blockCommunityId: 0,
    currentTab: "settings",
    siteRes: this.isoData.site_res,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
    this.handleSortTypeChange = this.handleSortTypeChange.bind(this);
    this.handleListingTypeChange = this.handleListingTypeChange.bind(this);
    this.handleBioChange = this.handleBioChange.bind(this);

    this.handleAvatarUpload = this.handleAvatarUpload.bind(this);
    this.handleAvatarRemove = this.handleAvatarRemove.bind(this);

    this.handleBannerUpload = this.handleBannerUpload.bind(this);
    this.handleBannerRemove = this.handleBannerRemove.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    this.setUserInfo();

    setupTippy();
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
  }

  get documentTitle(): string {
    return i18n.t("settings");
  }

  render() {
    return (
      <div class="container">
        <>
          <HtmlTags
            title={this.documentTitle}
            path={this.context.router.route.match.url}
            description={this.documentTitle}
            image={this.state.saveUserSettingsForm.avatar}
          />
          <ul class="nav nav-tabs mb-2">
            <li class="nav-item">
              <button
                class={`nav-link btn ${
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
            <li class="nav-item">
              <button
                class={`nav-link btn ${
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
      <div class="row">
        <div class="col-12 col-md-6">
          <div class="card border-secondary mb-3">
            <div class="card-body">{this.saveUserSettingsHtmlForm()}</div>
          </div>
        </div>
        <div class="col-12 col-md-6">
          <div class="card border-secondary mb-3">
            <div class="card-body">{this.changePasswordHtmlForm()}</div>
          </div>
        </div>
      </div>
    );
  }

  blockCards() {
    return (
      <div class="row">
        <div class="col-12 col-md-6">
          <div class="card border-secondary mb-3">
            <div class="card-body">{this.blockUserCard()}</div>
          </div>
        </div>
        <div class="col-12 col-md-6">
          <div class="card border-secondary mb-3">
            <div class="card-body">{this.blockCommunityCard()}</div>
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
          <div class="form-group row">
            <label class="col-sm-5 col-form-label" htmlFor="user-password">
              {i18n.t("new_password")}
            </label>
            <div class="col-sm-7">
              <input
                type="password"
                id="user-password"
                class="form-control"
                value={this.state.changePasswordForm.new_password}
                autoComplete="new-password"
                maxLength={60}
                onInput={linkEvent(this, this.handleNewPasswordChange)}
              />
            </div>
          </div>
          <div class="form-group row">
            <label
              class="col-sm-5 col-form-label"
              htmlFor="user-verify-password"
            >
              {i18n.t("verify_password")}
            </label>
            <div class="col-sm-7">
              <input
                type="password"
                id="user-verify-password"
                class="form-control"
                value={this.state.changePasswordForm.new_password_verify}
                autoComplete="new-password"
                maxLength={60}
                onInput={linkEvent(this, this.handleNewPasswordVerifyChange)}
              />
            </div>
          </div>
          <div class="form-group row">
            <label class="col-sm-5 col-form-label" htmlFor="user-old-password">
              {i18n.t("old_password")}
            </label>
            <div class="col-sm-7">
              <input
                type="password"
                id="user-old-password"
                class="form-control"
                value={this.state.changePasswordForm.old_password}
                autoComplete="new-password"
                maxLength={60}
                onInput={linkEvent(this, this.handleOldPasswordChange)}
              />
            </div>
          </div>
          <div class="form-group">
            <button type="submit" class="btn btn-block btn-secondary mr-4">
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
        <ul class="list-unstyled mb-0">
          {this.state.personBlocks.map(pb => (
            <li>
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
      <div class="form-group row">
        <label class="col-md-4 col-form-label" htmlFor="block-person-filter">
          {i18n.t("block_user")}
        </label>
        <div class="col-md-8">
          <select
            class="form-control"
            id="block-person-filter"
            value={this.state.blockPersonId}
          >
            <option value="0">—</option>
            {this.state.blockPerson && (
              <option value={this.state.blockPerson.person.id}>
                {personSelectName(this.state.blockPerson)}
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
        <ul class="list-unstyled mb-0">
          {this.state.communityBlocks.map(cb => (
            <li>
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
      <div class="form-group row">
        <label class="col-md-4 col-form-label" htmlFor="block-community-filter">
          {i18n.t("block_community")}
        </label>
        <div class="col-md-8">
          <select
            class="form-control"
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
    return (
      <>
        <h5>{i18n.t("settings")}</h5>
        <form onSubmit={linkEvent(this, this.handleSaveSettingsSubmit)}>
          <div class="form-group row">
            <label class="col-sm-5 col-form-label" htmlFor="display-name">
              {i18n.t("display_name")}
            </label>
            <div class="col-sm-7">
              <input
                id="display-name"
                type="text"
                class="form-control"
                placeholder={i18n.t("optional")}
                value={this.state.saveUserSettingsForm.display_name}
                onInput={linkEvent(this, this.handleDisplayNameChange)}
                pattern="^(?!@)(.+)$"
                minLength={3}
              />
            </div>
          </div>
          <div class="form-group row">
            <label class="col-sm-3 col-form-label" htmlFor="user-bio">
              {i18n.t("bio")}
            </label>
            <div class="col-sm-9">
              <MarkdownTextArea
                initialContent={this.state.saveUserSettingsForm.bio}
                onContentChange={this.handleBioChange}
                maxLength={300}
                hideNavigationWarnings
              />
            </div>
          </div>

          {/*<div class="form-group row">
            <label class="col-sm-3 col-form-label" htmlFor="user-email">
              {i18n.t("email")}
            </label>
            <div class="col-sm-9">
              <input
                type="email"
                id="user-email"
                class="form-control"
                placeholder={i18n.t("optional")}
                value={this.state.saveUserSettingsForm.email}
                onInput={linkEvent(this, this.handleEmailChange)}
                minLength={3}
              />
            </div>
          </div>*/}
            <div class="form-group row">
            <label class="col-lg-3 col-form-label" htmlFor="user-pi-address">
              {i18n.t("Pi Network Address")}
            </label>
            <div class="col-lg-9">
              <input
                type="text"
                id="user-pi-address"
                class="form-control"
                placeholder={i18n.t("Pi Network Address ( G... )")}
                value={this.state.saveUserSettingsForm.pi_address}
                onInput={linkEvent(this, this.handlePiAddressChange)}
                pattern="^G[A-Za-z0-9]*$"
                minLength={3}
              />
            </div>
          </div>
          <div class="form-group row">
            <label class="col-lg-3 col-form-label" htmlFor="user-web3-address">
              {i18n.t("Web3 Address")}
            </label>
            <div class="col-lg-9">
              <input
                type="text"
                id="user-web3-address"
                class="form-control"
                placeholder={i18n.t("ETH, BSC, MATIC address ( 0x7ab111c7846b10e06963b2e6484a2462dc5851aa )")}
                value={this.state.saveUserSettingsForm.web3_address}
                onInput={linkEvent(this, this.handleWeb3AddresslChange)}
                pattern="^0x[a-fA-F0-9]{40}$"
                minLength={3}
              />
            </div>
          </div>
          <div class="form-group row">
            <label class="col-sm-5 col-form-label" htmlFor="matrix-user-id">
              <a href={elementUrl} rel="noopener">
                {i18n.t("matrix_user_id")}
              </a>
            </label>
            <div class="col-sm-7">
              <input
                id="matrix-user-id"
                type="text"
                class="form-control"
                placeholder="@user:example.com"
                value={this.state.saveUserSettingsForm.matrix_user_id}
                onInput={linkEvent(this, this.handleMatrixUserIdChange)}
                pattern="^@[A-Za-z0-9._=-]+:[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
              />
            </div>
          </div>
          <div class="form-group row">
            <label class="col-sm-3">{i18n.t("avatar")}</label>
            <div class="col-sm-9">
              <ImageUploadForm
                uploadTitle={i18n.t("upload_avatar")}
                imageSrc={this.state.saveUserSettingsForm.avatar}
                onUpload={this.handleAvatarUpload}
                onRemove={this.handleAvatarRemove}
                rounded
              />
            </div>
          </div>
          <div class="form-group row">
            <label class="col-sm-3">{i18n.t("banner")}</label>
            <div class="col-sm-9">
              <ImageUploadForm
                uploadTitle={i18n.t("upload_banner")}
                imageSrc={this.state.saveUserSettingsForm.banner}
                onUpload={this.handleBannerUpload}
                onRemove={this.handleBannerRemove}
              />
            </div>
          </div>
          <div class="form-group row">
            <label class="col-sm-3" htmlFor="user-language">
              {i18n.t("language")}
            </label>
            <div class="col-sm-9">
              <select
                id="user-language"
                value={this.state.saveUserSettingsForm.lang}
                onChange={linkEvent(this, this.handleLangChange)}
                class="custom-select w-auto"
              >
                <option disabled aria-hidden="true">
                  {i18n.t("language")}
                </option>
                <option value="browser">{i18n.t("browser_default")}</option>
                <option disabled aria-hidden="true">
                  ──
                </option>
                {languages.sort().map(lang => (
                  <option value={lang.code}>
                    {ISO6391.getNativeName(lang.code) || lang.code}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div class="form-group row">
            <label class="col-sm-3" htmlFor="user-theme">
              {i18n.t("theme")}
            </label>
            <div class="col-sm-9">
              <select
                id="user-theme"
                value={this.state.saveUserSettingsForm.theme}
                onChange={linkEvent(this, this.handleThemeChange)}
                class="custom-select w-auto"
              >
                <option disabled aria-hidden="true">
                  {i18n.t("theme")}
                </option>
                <option value="browser">{i18n.t("browser_default")}</option>
                {themes.map(theme => (
                  <option value={theme}>{theme}</option>
                ))}
              </select>
            </div>
          </div>
          <form className="form-group row">
            <label class="col-sm-3">{i18n.t("type")}</label>
            <div class="col-sm-9">
              <ListingTypeSelect
                type_={
                  Object.values(ListingType)[
                    this.state.saveUserSettingsForm.default_listing_type
                  ]
                }
                showLocal={showLocal(this.isoData)}
                onChange={this.handleListingTypeChange}
              />
            </div>
          </form>
          <form className="form-group row">
            <label class="col-sm-3">{i18n.t("sort_type")}</label>
            <div class="col-sm-9">
              <SortSelect
                sort={
                  Object.values(SortType)[
                    this.state.saveUserSettingsForm.default_sort_type
                  ]
                }
                onChange={this.handleSortTypeChange}
              />
            </div>
          </form>
          {this.state.siteRes.site_view.site.enable_nsfw && (
            <div class="form-group">
              <div class="form-check">
                <input
                  class="form-check-input"
                  id="user-show-nsfw"
                  type="checkbox"
                  checked={this.state.saveUserSettingsForm.show_nsfw}
                  onChange={linkEvent(this, this.handleShowNsfwChange)}
                />
                <label class="form-check-label" htmlFor="user-show-nsfw">
                  {i18n.t("show_nsfw")}
                </label>
              </div>
            </div>
          )}
          <div class="form-group">
            <div class="form-check">
              <input
                class="form-check-input"
                id="user-show-scores"
                type="checkbox"
                checked={this.state.saveUserSettingsForm.show_scores}
                onChange={linkEvent(this, this.handleShowScoresChange)}
              />
              <label class="form-check-label" htmlFor="user-show-scores">
                {i18n.t("show_scores")}
              </label>
            </div>
          </div>
          <div class="form-group">
            <div class="form-check">
              <input
                class="form-check-input"
                id="user-show-avatars"
                type="checkbox"
                checked={this.state.saveUserSettingsForm.show_avatars}
                onChange={linkEvent(this, this.handleShowAvatarsChange)}
              />
              <label class="form-check-label" htmlFor="user-show-avatars">
                {i18n.t("show_avatars")}
              </label>
            </div>
          </div>
          <div class="form-group">
            <div class="form-check">
              <input
                class="form-check-input"
                id="user-bot-account"
                type="checkbox"
                checked={this.state.saveUserSettingsForm.bot_account}
                onChange={linkEvent(this, this.handleBotAccount)}
              />
              <label class="form-check-label" htmlFor="user-bot-account">
                {i18n.t("bot_account")}
              </label>
            </div>
          </div>
          <div class="form-group">
            <div class="form-check">
              <input
                class="form-check-input"
                id="user-show-bot-accounts"
                type="checkbox"
                checked={this.state.saveUserSettingsForm.show_bot_accounts}
                onChange={linkEvent(this, this.handleShowBotAccounts)}
              />
              <label class="form-check-label" htmlFor="user-show-bot-accounts">
                {i18n.t("show_bot_accounts")}
              </label>
            </div>
          </div>
          <div class="form-group">
            <div class="form-check">
              <input
                class="form-check-input"
                id="user-show-read-posts"
                type="checkbox"
                checked={this.state.saveUserSettingsForm.show_read_posts}
                onChange={linkEvent(this, this.handleReadPosts)}
              />
              <label class="form-check-label" htmlFor="user-show-read-posts">
                {i18n.t("show_read_posts")}
              </label>
            </div>
          </div>
          <div class="form-group">
            <div class="form-check">
              <input
                class="form-check-input"
                id="user-show-new-post-notifs"
                type="checkbox"
                checked={this.state.saveUserSettingsForm.show_new_post_notifs}
                onChange={linkEvent(this, this.handleShowNewPostNotifs)}
              />
              <label
                class="form-check-label"
                htmlFor="user-show-new-post-notifs"
              >
                {i18n.t("show_new_post_notifs")}
              </label>
            </div>
          </div>
          <div class="form-group">
            <div class="form-check">
              <input
                class="form-check-input"
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
                class="form-check-label"
                htmlFor="user-send-notifications-to-email"
              >
                {i18n.t("send_notifications_to_email")}
              </label>
            </div>
          </div>
          <div class="form-group">
            <button type="submit" class="btn btn-block btn-secondary mr-4">
              {this.state.saveUserSettingsLoading ? (
                <Spinner />
              ) : (
                capitalizeFirstLetter(i18n.t("save"))
              )}
            </button>
          </div>
          <hr />
          { !this.isPiBrowser && (
          <div class="form-group">
            <button
              class="btn btn-block btn-secondary mr-4"
              onClick={linkEvent(
                this,
                this.handleBlockchain
              )}
            >
              {i18n.t("Blockchain")}
            </button>
            </div>
            )}
            <hr />  
            { this.isPiBrowser && (
              <div class="form-group">
              <button
                class="btn btn-block btn-secondary mr-4"
                onClick={linkEvent(
                  this,
                  this.handlePiBlockchain
                )}
              >
                {i18n.t("Save to Pi Blockchain")}
              </button>
              </div>            
            )}
            { this.isPiBrowser &&
            (<hr />)
            }
          <div class="form-group">
            <button
              class="btn btn-block btn-danger"
              onClick={linkEvent(
                this,
                this.handleDeleteAccountShowConfirmToggle
              )}
            >
              {i18n.t("delete_account")}
            </button>
            {this.state.deleteAccountShowConfirm && (
              <>
                <div class="my-2 alert alert-danger" role="alert">
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
                  class="form-control my-2"
                />
                <button
                  class="btn btn-danger mr-4"
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
                  class="btn btn-secondary"
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
    return isBrowser() && navigator.userAgent.includes('PiBrowser') ;
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
            let persons = (await fetchUsers(e.detail.value)).users;
            let choices = persons.map(pvs => personToChoice(pvs));
            this.blockPersonChoices.setChoices(choices, "value", "label", true);
          }, 400),
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
            let communities = (await fetchCommunities(e.detail.value))
              .communities;
            let choices = communities.map(cv => communityToChoice(cv));
            this.blockCommunityChoices.setChoices(
              choices,
              "value",
              "label",
              true
            );
          }, 400),
          false
        );
      }
    }
  }

  handleBlockPerson(personId: string) {
    if (personId != undefined) {
      let blockUserForm: BlockPerson = {
        person_id: personId,
        block: true,
        auth: authField(),
      };
      WebSocketService.Instance.send(wsClient.blockPerson(blockUserForm));
    }
  }

  handleUnblockPerson(i: { ctx: Settings; recipientId: string }) {
    let blockUserForm: BlockPerson = {
      person_id: i.recipientId,
      block: false,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.blockPerson(blockUserForm));
  }

  handleBlockCommunity(community_id: string) {
    if (community_id != undefined) {
      let blockCommunityForm: BlockCommunity = {
        community_id,
        block: true,
        auth: authField(),
      };
      WebSocketService.Instance.send(
        wsClient.blockCommunity(blockCommunityForm)
      );
    }
  }

  handleUnblockCommunity(i: { ctx: Settings; communityId: string }) {
    let blockCommunityForm: BlockCommunity = {
      community_id: i.communityId,
      block: false,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.blockCommunity(blockCommunityForm));
  }

  handleShowNsfwChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.show_nsfw = event.target.checked;
    i.setState(i.state);
  }

  handleShowAvatarsChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.show_avatars = event.target.checked;
    UserService.Instance.myUserInfo.local_user_view.local_user.show_avatars =
      event.target.checked; // Just for instant updates
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
    UserService.Instance.myUserInfo.local_user_view.local_user.show_scores =
      event.target.checked; // Just for instant updates
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

  handleLangChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.lang = event.target.value;
    i18n.changeLanguage(getLanguage(i.state.saveUserSettingsForm.lang));
    i.setState(i.state);
  }

  handleSortTypeChange(val: SortType) {
    this.state.saveUserSettingsForm.default_sort_type =
      Object.keys(SortType).indexOf(val);
    this.setState(this.state);
  }

  handleListingTypeChange(val: ListingType) {
    this.state.saveUserSettingsForm.default_listing_type =
      Object.keys(ListingType).indexOf(val);
    this.setState(this.state);
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
    this.state.saveUserSettingsForm.bio = val;
    this.setState(this.state);
  }

  handleAvatarUpload(url: string) {
    this.state.saveUserSettingsForm.avatar = url;
    this.setState(this.state);
  }

  handleAvatarRemove() {
    this.state.saveUserSettingsForm.avatar = "";
    this.setState(this.state);
  }

  handleBannerUpload(url: string) {
    this.state.saveUserSettingsForm.banner = url;
    this.setState(this.state);
  }

  handleBannerRemove() {
    this.state.saveUserSettingsForm.banner = "";
    this.setState(this.state);
  }

  handleDisplayNameChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.display_name = event.target.value;
    i.setState(i.state);
  }

  handleMatrixUserIdChange(i: Settings, event: any) {
    i.state.saveUserSettingsForm.matrix_user_id = event.target.value;
    if (
      i.state.saveUserSettingsForm.matrix_user_id == "" &&
      !UserService.Instance.myUserInfo.local_user_view.person.matrix_user_id
    ) {
      i.state.saveUserSettingsForm.matrix_user_id = undefined;
    }
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
    i.state.saveUserSettingsLoading = true;
    i.setState(i.state);

    WebSocketService.Instance.send(
      wsClient.saveUserSettings(i.state.saveUserSettingsForm)
    );
  }

  handleChangePasswordSubmit(i: Settings, event: any) {
    event.preventDefault();
    i.state.changePasswordLoading = true;
    i.setState(i.state);

    WebSocketService.Instance.send(
      wsClient.changePassword(i.state.changePasswordForm)
    );
  }

  handleDeleteAccountShowConfirmToggle(i: Settings, event: any) {
    event.preventDefault();
    i.state.deleteAccountShowConfirm = !i.state.deleteAccountShowConfirm;
    i.setState(i.state);
  }

  handleDeleteAccountPasswordChange(i: Settings, event: any) {
    i.state.deleteAccountForm.password = event.target.value;
    i.setState(i.state);
  }

  handleDeleteAccount(i: Settings, event: any) {
    event.preventDefault();
    i.state.deleteAccountLoading = true;
    i.setState(i.state);

    WebSocketService.Instance.send(
      wsClient.deleteAccount(i.state.deleteAccountForm)
    );
  }

  handleSwitchTab(i: { ctx: Settings; tab: string }) {
    i.ctx.setState({ currentTab: i.tab });

    if (i.ctx.state.currentTab == "blocks") {
      i.ctx.setupBlockPersonChoices();
      i.ctx.setupBlockCommunityChoices();
    }
  }

  setUserInfo() {
    if (UserService.Instance.myUserInfo===undefined)
      return;
    if (UserService.Instance.myUserInfo===null)
      return;
    if (UserService.Instance.myUserInfo.local_user_view===undefined)
      return;
    let luv = UserService.Instance.myUserInfo.local_user_view;
    this.state.saveUserSettingsForm.show_nsfw = luv.local_user.show_nsfw;
    this.state.saveUserSettingsForm.theme = luv.local_user.theme
      ? luv.local_user.theme
      : "browser";
    this.state.saveUserSettingsForm.default_sort_type =
      luv.local_user.default_sort_type;
    this.state.saveUserSettingsForm.default_listing_type =
      luv.local_user.default_listing_type;
    this.state.saveUserSettingsForm.lang = luv.local_user.lang;
    this.state.saveUserSettingsForm.avatar = luv.person.avatar;
    this.state.saveUserSettingsForm.banner = luv.person.banner;
    this.state.saveUserSettingsForm.display_name = luv.person.display_name;
    this.state.saveUserSettingsForm.show_avatars = luv.local_user.show_avatars;
    this.state.saveUserSettingsForm.bot_account = luv.person.bot_account;
    this.state.saveUserSettingsForm.show_bot_accounts =
      luv.local_user.show_bot_accounts;
    this.state.saveUserSettingsForm.show_scores = luv.local_user.show_scores;
    this.state.saveUserSettingsForm.show_read_posts =
      luv.local_user.show_read_posts;
    this.state.saveUserSettingsForm.show_new_post_notifs =
      luv.local_user.show_new_post_notifs;
    this.state.saveUserSettingsForm.email = luv.local_user.email;
    this.state.saveUserSettingsForm.bio = luv.person.bio;
    this.state.saveUserSettingsForm.send_notifications_to_email =
      luv.local_user.send_notifications_to_email;
    this.state.saveUserSettingsForm.matrix_user_id = luv.person.matrix_user_id;
    this.state.personBlocks = UserService.Instance.myUserInfo.person_blocks;
    this.state.communityBlocks =
      UserService.Instance.myUserInfo.community_blocks;
    this.state.saveUserSettingsForm.pi_address = luv.person.pi_address;
    this.state.saveUserSettingsForm.web3_address = luv.person.web3_address;
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      return;
    } else if (op == UserOperation.SaveUserSettings) {
      let data = wsJsonToRes<LoginResponse>(msg).data;
      UserService.Instance.login(data);
      this.state.saveUserSettingsLoading = false;
      this.setState(this.state);

      window.scrollTo(0, 0);
    } else if (op == UserOperation.ChangePassword) {
      let data = wsJsonToRes<LoginResponse>(msg).data;
      UserService.Instance.login(data);
      this.state.changePasswordLoading = false;
      this.setState(this.state);
      window.scrollTo(0, 0);
      toast(i18n.t("password_changed"));
    } else if (op == UserOperation.DeleteAccount) {
      this.setState({
        deleteAccountLoading: false,
        deleteAccountShowConfirm: false,
      });
      UserService.Instance.logout();
      window.location.href = "/";
      location.reload();
    } else if (op == UserOperation.BlockPerson) {
      let data = wsJsonToRes<BlockPersonResponse>(msg).data;
      this.setState({ personBlocks: updatePersonBlock(data) });
    } else if (op == UserOperation.BlockCommunity) {
      let data = wsJsonToRes<BlockCommunityResponse>(msg).data;
      this.setState({ communityBlocks: updateCommunityBlock(data) });
    }
  }

  async handleBlockchain(i: Settings, event: any) {
      // WebSocketService.Instance.send(wsClient.savePost(form));
      if (UserService.Instance.myUserInfo===undefined)
        return;
      if (UserService.Instance.myUserInfo===null)
        return;
      if (UserService.Instance.myUserInfo.local_user_view===undefined)
        return;

      const isMetaMaskInstalled = () => {
        //Have to check the ethereum binding on the window object to see if it's installed
        const { ethereum } = window;
        return Boolean(ethereum && ethereum.isMetaMask);
      };
      let luv = UserService.Instance.myUserInfo.local_user_view;
      var config = {
        memo: 'wepi:profile:'+luv.person.name,
        metadata: {
            id: luv.person.id,
            name: luv.person.name,
            display: luv.person.display_name,
            actor_id: luv.person.actor_id,
            t: luv.person.published,
            u: luv.person.updated,
            s: luv.person.cert,
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

    async handlePiBlockchain(i: Settings, event: any) {
      let luv = UserService.Instance.myUserInfo.local_user_view;      
      var config = {
        amount: 0.001,
        //memo: ('wepi:profile:'+luv.person.name).substr(0,28),
        memo: 'wepi:profile',
        metadata: {
            id: luv.person.id,
            name: luv.person.name,
            display: luv.person.display_name,
            actor_id: luv.person.actor_id,
            //pi_address: luv.person.pi_address,
            //web3_address: luv.person.web3_address,
            t: luv.person.published,
            u: luv.person.updated,
            s: luv.person.cert,
        }
      };
      var info = {
        own: luv.person.id,
        comment: luv.person.name,
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
          //paymentConfig
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
            //paymentConfig,
        }).then((data) => {
          if (data.status >= 200 && data.status < 300) {
              return true;
          } else {
            alert("Payment complete error: " + JSON.stringify(data));  
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

