import { Component, createRef, linkEvent, RefObject } from "inferno";
import { NavLink } from "inferno-router";
import {
  CommentResponse,
  GetReportCount,
  GetReportCountResponse,
  GetSiteResponse,
  GetUnreadCount,
  GetUnreadCountResponse,
  GetUnreadRegistrationApplicationCount,
  GetUnreadRegistrationApplicationCountResponse,
  PrivateMessageResponse,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { UserService, WebSocketService } from "../../services";
import {
  amAdmin,
  canCreateCommunity,
  isBrowser,
  myAuth,
  notifyComment,
  notifyPrivateMessage,
  numToSI,
  showAvatars,
  toast,
  wsClient,
  wsSubscribe,
} from "../../utils";
import { Icon } from "../common/icon";
import { PictrsImage } from "../common/pictrs-image";

interface NavbarProps {
  siteRes: GetSiteResponse;
}

interface NavbarState {
  expanded: boolean;
  unreadInboxCount: number;
  unreadReportCount: number;
  unreadApplicationCount: number;
  searchParam: string;
  toggleSearch: boolean;
  showDropdown: boolean;
  onSiteBanner?(url: string): any;
}

export class Navbar extends Component<NavbarProps, NavbarState> {
  private wsSub: Subscription;
  private userSub: Subscription;
  private unreadInboxCountSub: Subscription;
  private unreadReportCountSub: Subscription;
  private unreadApplicationCountSub: Subscription;
  private searchTextField: RefObject<HTMLInputElement>;
  state: NavbarState = {
    unreadInboxCount: 0,
    unreadReportCount: 0,
    unreadApplicationCount: 0,
    expanded: false,
    searchParam: "",
    toggleSearch: false,
    showDropdown: false,
  };
  subscription: any;
  private walletConnected: boolean;

  constructor(props: any, context: any) {
    super(props, context);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);
    this.walletConnected = false;
  }

  get isPiBrowser(): boolean {
    return isBrowser() && navigator.userAgent.includes("PiBrowser");
  }

  onClickConnect = async () => {
    const onboardButton = document.getElementById("connectWallet");
    try {
      // Will open the MetaMask UI
      // You should disable this button while the request is pending!
      if (this.walletConnected === false) {
        await ethereum.request({ method: "eth_requestAccounts" });
        this.walletConnected = true;
        onboardButton.innerText = "Connected MetaMask";
      }
      //else {
      //  onboardButton.innerText = 'Connect MetaMask';
      //  this.walletConnected  = false;
      //}
    } catch (error) {
      console.error(error);
    }
  };
  onClickInstall = async () => {
    window.location.href = "https://metamask.io/download";
  };
  initialize = () => {
    if (!this.isPiBrowser) {
      const onboardButton = document.getElementById("connectWallet");
      //You will start here
      //Created check function to see if the MetaMask extension is installed
      const isMetaMaskInstalled = () => {
        //Have to check the ethereum binding on the window object to see if it's installed
        const { ethereum } = window;
        return Boolean(ethereum && ethereum.isMetaMask);
      };
      //------Inserted Code------\\
      const MetaMaskClientCheck = () => {
        //Now we check to see if MetaMask is installed
        if (!isMetaMaskInstalled()) {
          //If it isn't installed we ask the user to click to install it
          onboardButton.innerText = "Install MetaMask";
          onboardButton.onclick = this.onClickInstall;
        } else {
          //If it is installed we change our button text
          onboardButton.innerText = "Connect MetaMask";
          onboardButton.onclick = this.onClickConnect;
          this.walletConnected = false;
        }
      };
      MetaMaskClientCheck();
    }
  };

  componentDidMount() {
    // Subscribe to jwt changes
    if (isBrowser()) {
      this.searchTextField = createRef();

      // On the first load, check the unreads
      let auth = myAuth(false);
      if (auth && UserService.Instance.myUserInfo) {
        this.requestNotificationPermission();
        WebSocketService.Instance.send(
          wsClient.userJoin({
            auth,
          })
        );

        this.fetchUnreads();
      }

      this.requestNotificationPermission();

      // Subscribe to unread count changes
      this.unreadInboxCountSub =
        UserService.Instance.unreadInboxCountSub.subscribe(res => {
          this.setState({ unreadInboxCount: res });
        });
      // Subscribe to unread report count changes
      this.unreadReportCountSub =
        UserService.Instance.unreadReportCountSub.subscribe(res => {
          this.setState({ unreadReportCount: res });
        });
      // Subscribe to unread application count
      this.unreadApplicationCountSub =
        UserService.Instance.unreadApplicationCountSub.subscribe(res => {
          this.setState({ unreadApplicationCount: res });
        });
    }

    // if (this.isPiBrowser) {
    // }
  }

  componentWillUnmount() {
    this.wsSub.unsubscribe();
    this.userSub.unsubscribe();
    this.unreadInboxCountSub.unsubscribe();
    this.unreadReportCountSub.unsubscribe();
    this.unreadApplicationCountSub.unsubscribe();
  }

  updateUrl() {
    const searchParam = this.state.searchParam;
    this.setState({ searchParam: "" });
    this.setState({ toggleSearch: false });
    this.setState({ showDropdown: false, expanded: false });
    if (searchParam === "") {
      this.context.router.history.push(`/search/`);
    } else {
      const searchParamEncoded = encodeURIComponent(searchParam);
      this.context.router.history.push(
        `/search/q/${searchParamEncoded}/type/All/sort/TopAll/listing_type/All/community_id/null/creator_id/null/page/1`
      );
    }
  }

  render() {
    return this.navbar();
  }

  // TODO class active corresponding to current page
  navbar() {
    let siteView = this.props.siteRes.site_view;
    let person = UserService.Instance.myUserInfo?.local_user_view.person;
    return (
      <nav className="navbar navbar-expand-md navbar-light shadow-sm p-0 px-3">
        <div className="container-lg">
          <NavLink
            to="/"
            onMouseUp={linkEvent(this, this.handleHideExpandNavbar)}
            title={siteView.site.description ?? siteView.site.name}
            className="d-flex align-items-center navbar-brand mr-md-3"
          >
            {siteView.site.icon && showAvatars() && (
              <PictrsImage src={siteView.site.icon} icon />
            )}
            {siteView.site.name}
          </NavLink>
          {UserService.Instance.myUserInfo && (
            <>
              <ul className="navbar-nav ml-auto">
                <li className="nav-item">
                  <NavLink
                    to="/inbox"
                    className="p-1 navbar-toggler nav-link border-0"
                    onMouseUp={linkEvent(this, this.handleHideExpandNavbar)}
                    title={i18n.t("unread_messages", {
                      count: this.state.unreadInboxCount,
                      formattedCount: numToSI(this.state.unreadInboxCount),
                    })}
                  >
                    <Icon icon="bell" />
                    {this.state.unreadInboxCount > 0 && (
                      <span className="mx-1 badge badge-light">
                        {numToSI(this.state.unreadInboxCount)}
                      </span>
                    )}
                  </NavLink>
                </li>
              </ul>
              {this.moderatesSomething && (
                <ul className="navbar-nav ml-1">
                  <li className="nav-item">
                    <NavLink
                      to="/reports"
                      className="p-1 navbar-toggler nav-link border-0"
                      onMouseUp={linkEvent(this, this.handleHideExpandNavbar)}
                      title={i18n.t("unread_reports", {
                        count: this.state.unreadReportCount,
                        formattedCount: numToSI(this.state.unreadReportCount),
                      })}
                    >
                      <Icon icon="shield" />
                      {this.state.unreadReportCount > 0 && (
                        <span className="mx-1 badge badge-light">
                          {numToSI(this.state.unreadReportCount)}
                        </span>
                      )}
                    </NavLink>
                  </li>
                </ul>
              )}
              {amAdmin() && (
                <ul className="navbar-nav ml-1">
                  <li className="nav-item">
                    <NavLink
                      to="/registration_applications"
                      className="p-1 navbar-toggler nav-link border-0"
                      onMouseUp={linkEvent(this, this.handleHideExpandNavbar)}
                      title={i18n.t("unread_registration_applications", {
                        count: this.state.unreadApplicationCount,
                        formattedCount: numToSI(
                          this.state.unreadApplicationCount
                        ),
                      })}
                    >
                      <Icon icon="clipboard" />
                      {this.state.unreadApplicationCount > 0 && (
                        <span className="mx-1 badge badge-light">
                          {numToSI(this.state.unreadApplicationCount)}
                        </span>
                      )}
                    </NavLink>
                  </li>
                </ul>
              )}
            </>
          )}
          <button
            className="navbar-toggler border-0 p-1"
            type="button"
            aria-label="menu"
            onClick={linkEvent(this, this.handleToggleExpandNavbar)}
            data-tippy-content={i18n.t("expand_here")}
          >
            <Icon icon="menu" />
          </button>
          <div
            className={`${!this.state.expanded && "collapse"} navbar-collapse`}
          >
            <ul className="navbar-nav my-2 mr-auto">
              <li className="nav-item">
                <NavLink
                  to="/communities"
                  className="nav-link"
                  onMouseUp={linkEvent(this, this.handleHideExpandNavbar)}
                  title={i18n.t("communities")}
                >
                  {i18n.t("communities")}
                </NavLink>
              </li>
              <li className="nav-item">
                {/* TODO make sure this works: https://github.com/infernojs/inferno/issues/1608 */}
                <NavLink
                  to={{
                    pathname: "/create_post",
                    search: "",
                    hash: "",
                    key: "",
                    state: { prevPath: this.currentLocation },
                  }}
                  className="nav-link"
                  onMouseUp={linkEvent(this, this.handleHideExpandNavbar)}
                  title={i18n.t("create_post")}
                >
                  {i18n.t("create_post")}
                </NavLink>
              </li>
              {canCreateCommunity(this.props.siteRes) && (
                <li className="nav-item">
                  <NavLink
                    to="/create_community"
                    className="nav-link"
                    onMouseUp={linkEvent(this, this.handleHideExpandNavbar)}
                    title={i18n.t("create_community")}
                  >
                    {i18n.t("create_community")}
                  </NavLink>
                </li>
              )}
              {/*
              <li className="nav-item">
                <a
                  className="nav-link"
                  title={i18n.t("support_lemmy")}
                  href={donateLemmyUrl}
                >
                  <Icon icon="heart" classes="small" />
                </a>
              </li>*/}
            </ul>
            <ul className="navbar-nav my-2">
              {amAdmin() && (
                <li className="nav-item">
                  <NavLink
                    to="/admin"
                    className="nav-link"
                    onMouseUp={linkEvent(this, this.handleHideExpandNavbar)}
                    title={i18n.t("admin_settings")}
                  >
                    <Icon icon="settings" />
                  </NavLink>
                </li>
              )}
            </ul>
            {!this.context.router.history.location.pathname.match(
              /^\/search/
            ) && (
              <ul className="navbar-nav">
                <li className="nav-item">
                  <form
                    className="form-inline mr-1"
                    onSubmit={linkEvent(this, this.handleSearchSubmit)}
                  >
                    <input
                      id="search-input"
                      className={`form-control mr-0 search-input ${
                        this.state.toggleSearch ? "show-input" : "hide-input"
                      }`}
                      onInput={linkEvent(this, this.handleSearchParam)}
                      value={this.state.searchParam}
                      ref={this.searchTextField}
                      disabled={!this.state.toggleSearch}
                      type="text"
                      placeholder={i18n.t("search")}
                      onBlur={linkEvent(this, this.handleSearchBlur)}
                    ></input>
                    <label className="sr-only" htmlFor="search-input">
                      {i18n.t("search")}
                    </label>
                    <button
                      name="search-btn"
                      onClick={linkEvent(this, this.handleSearchBtn)}
                      className="px-1 btn btn-link nav-link"
                      aria-label={i18n.t("search")}
                    >
                      <Icon icon="search" />
                    </button>
                  </form>
                </li>
              </ul>
            )}
            {UserService.Instance.myUserInfo ? (
              <>
                <ul className="navbar-nav my-2">
                  <li className="nav-item">
                    <NavLink
                      className="nav-link"
                      to="/inbox"
                      onMouseUp={linkEvent(this, this.handleHideExpandNavbar)}
                      title={i18n.t("unread_messages", {
                        count: this.state.unreadInboxCount,
                        formattedCount: numToSI(this.state.unreadInboxCount),
                      })}
                    >
                      <Icon icon="bell" />
                      {this.state.unreadInboxCount > 0 && (
                        <span className="ml-1 badge badge-light">
                          {numToSI(this.state.unreadInboxCount)}
                        </span>
                      )}
                    </NavLink>
                  </li>
                </ul>
                {this.moderatesSomething && (
                  <ul className="navbar-nav my-2">
                    <li className="nav-item">
                      <NavLink
                        className="nav-link"
                        to="/reports"
                        onMouseUp={linkEvent(this, this.handleHideExpandNavbar)}
                        title={i18n.t("unread_reports", {
                          count: this.state.unreadReportCount,
                          formattedCount: numToSI(this.state.unreadReportCount),
                        })}
                      >
                        <Icon icon="shield" />
                        {this.state.unreadReportCount > 0 && (
                          <span className="ml-1 badge badge-light">
                            {numToSI(this.state.unreadReportCount)}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  </ul>
                )}
                {amAdmin() && (
                  <ul className="navbar-nav my-2">
                    <li className="nav-item">
                      <NavLink
                        to="/registration_applications"
                        className="nav-link"
                        onMouseUp={linkEvent(this, this.handleHideExpandNavbar)}
                        title={i18n.t("unread_registration_applications", {
                          count: this.state.unreadApplicationCount,
                          formattedCount: numToSI(
                            this.state.unreadApplicationCount
                          ),
                        })}
                      >
                        <Icon icon="clipboard" />
                        {this.state.unreadApplicationCount > 0 && (
                          <span className="mx-1 badge badge-light">
                            {numToSI(this.state.unreadApplicationCount)}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  </ul>
                )}
                {person && (
                  <ul className="navbar-nav">
                    <li className="nav-item dropdown">
                      <button
                        className="nav-link btn btn-link dropdown-toggle"
                        onClick={linkEvent(this, this.handleToggleDropdown)}
                        id="navbarDropdown"
                        role="button"
                        aria-expanded="false"
                      >
                        <span>
                          {showAvatars() && person.avatar && (
                            <PictrsImage src={person.avatar} icon />
                          )}
                          {person.display_name ?? person.name}
                        </span>
                      </button>
                      {this.state.showDropdown && (
                        <div
                          className="dropdown-content"
                          onMouseLeave={linkEvent(
                            this,
                            this.handleToggleDropdown
                          )}
                        >
                          <li className="nav-item">
                            <NavLink
                              to={`/u/${person.name}`}
                              className="nav-link"
                              title={i18n.t("profile")}
                            >
                              <Icon icon="user" classes="mr-1" />
                              {i18n.t("profile")}
                            </NavLink>
                          </li>
                          <li className="nav-item">
                            <NavLink
                              to="/settings"
                              className="nav-link"
                              title={i18n.t("settings")}
                            >
                              <Icon icon="settings" classes="mr-1" />
                              {i18n.t("settings")}
                            </NavLink>
                          </li>
                          <li>
                            <hr className="dropdown-divider" />
                          </li>
                          <li className="nav-item">
                            <button
                              className="nav-link btn btn-link"
                              onClick={linkEvent(this, this.handleLogoutClick)}
                              title="test"
                            >
                              <Icon icon="log-out" classes="mr-1" />
                              {i18n.t("logout")}
                            </button>
                          </li>
                        </div>
                      )}
                    </li>
                  </ul>
                )}
              </>
            ) : (
              <ul className="navbar-nav my-2">
                <li className="nav-item">
                  <NavLink
                    to="/login"
                    className="nav-link"
                    onMouseUp={linkEvent(this, this.handleHideExpandNavbar)}
                    title={i18n.t("login")}
                  >
                    {i18n.t("login")}
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink
                    to="/signup"
                    className="nav-link"
                    onMouseUp={linkEvent(this, this.handleHideExpandNavbar)}
                    title={i18n.t("sign_up")}
                  >
                    {i18n.t("sign_up")}
                  </NavLink>
                </li>
              </ul>
            )}
            {!this.isPiBrowser && (
              <ul className="navbar-nav my-2">
                <li className="ml-2 nav-item">
                  <button
                    id="connectWallet"
                    className="btn btn-success"
                    onClick={linkEvent(this, this.handleConnectWallet)}
                    title={i18n.t("Connect Wallet")}
                  >
                    {i18n.t("Connect Wallet")}
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>
      </nav>
    );
  }

  get moderatesSomething(): boolean {
    let mods = UserService.Instance.myUserInfo?.moderates;
    let moderatesS = (mods && mods.length > 0) || false;
    return amAdmin() || moderatesS;
  }

  handleToggleExpandNavbar(i: Navbar) {
    i.setState({ expanded: !i.state.expanded });
  }

  handleHideExpandNavbar(i: Navbar) {
    i.setState({ expanded: false, showDropdown: false });
  }

  handleSearchParam(i: Navbar, event: any) {
    i.setState({ searchParam: event.target.value });
  }

  handleSearchSubmit(i: Navbar, event: any) {
    event.preventDefault();
    i.updateUrl();
  }

  handleSearchBtn(i: Navbar, event: any) {
    event.preventDefault();
    i.setState({ toggleSearch: true });

    i.searchTextField.current?.focus();
    const offsetWidth = i.searchTextField.current?.offsetWidth;
    if (i.state.searchParam && offsetWidth && offsetWidth > 100) {
      i.updateUrl();
    }
  }

  handleSearchBlur(i: Navbar, event: any) {
    if (!(event.relatedTarget && event.relatedTarget.name !== "search-btn")) {
      i.setState({ toggleSearch: false });
    }
  }

  handleLogoutClick(i: Navbar) {
    i.setState({ showDropdown: false, expanded: false });
    UserService.Instance.logout();
  }

  handleToggleDropdown(i: Navbar) {
    i.setState({ showDropdown: !i.state.showDropdown });
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      if (msg.error == "not_logged_in") {
        UserService.Instance.logout();
      }
      return;
    } else if (msg.reconnect) {
      console.log(i18n.t("websocket_reconnected"));
      let auth = myAuth(false);
      if (UserService.Instance.myUserInfo && auth) {
        WebSocketService.Instance.send(
          wsClient.userJoin({
            auth,
          })
        );
        this.fetchUnreads();
      }
    } else if (op == UserOperation.GetUnreadCount) {
      let data = wsJsonToRes<GetUnreadCountResponse>(msg);
      this.setState({
        unreadInboxCount: data.replies + data.mentions + data.private_messages,
      });
      this.sendUnreadCount();
    } else if (op == UserOperation.GetReportCount) {
      let data = wsJsonToRes<GetReportCountResponse>(msg);
      this.setState({
        unreadReportCount:
          data.post_reports +
          data.comment_reports +
          (data.private_message_reports ?? 0),
      });
      this.sendReportUnread();
    } else if (op == UserOperation.GetUnreadRegistrationApplicationCount) {
      let data =
        wsJsonToRes<GetUnreadRegistrationApplicationCountResponse>(msg);
      this.setState({ unreadApplicationCount: data.registration_applications });
      this.sendApplicationUnread();
    } else if (op == UserOperation.CreateComment) {
      let data = wsJsonToRes<CommentResponse>(msg);
      let mui = UserService.Instance.myUserInfo;
      if (
        mui &&
        data.recipient_ids.includes(mui.local_user_view.local_user.id)
      ) {
        this.setState({
          unreadInboxCount: this.state.unreadInboxCount + 1,
        });
        this.sendUnreadCount();
        notifyComment(data.comment_view, this.context.router);
      }
    } else if (op == UserOperation.CreatePrivateMessage) {
      let data = wsJsonToRes<PrivateMessageResponse>(msg);

      if (
        data.private_message_view.recipient.id ==
        UserService.Instance.myUserInfo?.local_user_view.person.id
      ) {
        this.setState({
          unreadInboxCount: this.state.unreadInboxCount + 1,
        });
        this.sendUnreadCount();
        notifyPrivateMessage(data.private_message_view, this.context.router);
      }
    } else if (op == UserOperation.PiPaymentFound) {
      console.log("Nav:" + JSON.stringify(msg));
    }
  }

  fetchUnreads() {
    console.log("Fetching inbox unreads...");

    let auth = myAuth();
    if (auth) {
      let unreadForm: GetUnreadCount = {
        auth,
      };
      WebSocketService.Instance.send(wsClient.getUnreadCount(unreadForm));

      console.log("Fetching reports...");

      let reportCountForm: GetReportCount = {
        auth,
      };
      WebSocketService.Instance.send(wsClient.getReportCount(reportCountForm));

      if (amAdmin()) {
        console.log("Fetching applications...");

        let applicationCountForm: GetUnreadRegistrationApplicationCount = {
          auth,
        };
        WebSocketService.Instance.send(
          wsClient.getUnreadRegistrationApplicationCount(applicationCountForm)
        );
      }
    }
  }

  get currentLocation() {
    return this.context.router.history.location.pathname;
  }

  sendUnreadCount() {
    UserService.Instance.unreadInboxCountSub.next(this.state.unreadInboxCount);
  }

  sendReportUnread() {
    UserService.Instance.unreadReportCountSub.next(
      this.state.unreadReportCount
    );
  }

  sendApplicationUnread() {
    UserService.Instance.unreadApplicationCountSub.next(
      this.state.unreadApplicationCount
    );
  }

  requestNotificationPermission() {
    if (UserService.Instance.myUserInfo) {
      document.addEventListener("DOMContentLoaded", function () {
        if (!Notification) {
          toast(i18n.t("notifications_error"), "danger");
          return;
        }

        if (Notification.permission !== "granted")
          Notification.requestPermission();
      });
    }
  }

  handleConnectWallet(i: Navbar) {
    //i.setState({ showDropdown: false, expanded: false });
    //i.context.router.history.push(`/login`);
    if (typeof window.ethereum !== "undefined") {
      console.log("MetaMask is installed!");
      window.ethereum.request({ method: "eth_requestAccounts" });
    }
  }
}
