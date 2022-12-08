import { None, Some } from "@sniptt/monads";
import { Component, linkEvent } from "inferno";
import {
  ExternalAccount,
  GetSiteResponse,
  LemmyHttp,
  Login as LoginForm,
  LoginResponse,
  PasswordReset,
  PiLogin as PiLoginForm,
  PiPaymentFound,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { httpBase } from "../../../shared/env";
import { i18n } from "../../i18next";
import { UserService, WebSocketService } from "../../services";
import {
  isBrowser,
  setIsoData,
  toast,
  wsClient,
  wsSubscribe,
} from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";

interface State {
  piLoginForm: PiLoginForm;
  loginForm: LoginForm;
  loginLoading: boolean;
  siteRes: GetSiteResponse;
}

export class Login extends Component<any, State> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;

  emptyState: State = {
    piLoginForm: {
      domain: None,
      ea: new ExternalAccount({
        account: undefined,
        token: undefined,
        epoch: 0,
        signature: None,
        provider: None,
        extra: None,
        uuid: None,
      }),
      info: undefined,
    },
    loginForm: new LoginForm({
      username_or_email: undefined,
      password: undefined,
    }),
    loginLoading: false,
    siteRes: this.isoData.site_res,
  };

  constructor(props: any, context: any) {
    super(props, context);
    //console.log('props', this.props)
    this.state = this.emptyState;

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    if (isBrowser()) {
      WebSocketService.Instance.send(wsClient.getCaptcha());
    }
  }

  componentDidMount() {
    // Navigate to home if already logged in
    if (UserService.Instance.myUserInfo.isSome()) {
      this.context.router.history.push("/");
    }
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription.unsubscribe();
    }
  }

  get documentTitle(): string {
    return `${i18n.t("login")} - ${this.state.siteRes.site_view.site.name}`;
  }

  get isWePi(): boolean {
    return isBrowser() && window.location.hostname == "wepi.social";
  }

  get isPiBrowser(): boolean {
    if (isBrowser()) {
      if (navigator.userAgent.includes("PiBrowser")) return true;
      if (window.Pi != null) {
        return true;
      }
    }
    return false;
  }

  get isForcePiAuth(): boolean {
    return true;
    //return isPiBrowser() && navigator.userAgent.includes('PiBrowser');
  }

  render() {
    return (
      <div className="container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
          description={None}
          image={None}
        />
        <div className="row">
          <div className="col-12 col-lg-6 offset-lg-3">{this.loginForm()}</div>
        </div>
      </div>
    );
  }

  loginForm() {
    if (!this.isPiBrowser || !this.isForcePiAuth) {
      return (
        <div>
          <form onSubmit={linkEvent(this, this.handleLoginSubmit)}>
            <h5>{i18n.t("login")}</h5>
            <div className="form-group row">
              <label
                className="col-sm-2 col-form-label"
                htmlFor="login-username"
              >
                {i18n.t("username")}
              </label>
              <div className="col-sm-10">
                <input
                  type="text"
                  className="form-control"
                  id="login-email-or-username"
                  value={this.state.loginForm.username_or_email}
                  onInput={linkEvent(this, this.handleLoginUsernameChange)}
                  autoComplete="email"
                  required
                  minLength={3}
                />
              </div>
            </div>
            <div className="form-group row">
              <label
                className="col-sm-2 col-form-label"
                htmlFor="login-password"
              >
                {i18n.t("password")}
              </label>
              <div className="col-sm-10">
                <input
                  type="password"
                  id="login-password"
                  value={this.state.loginForm.password}
                  onInput={linkEvent(this, this.handleLoginPasswordChange)}
                  className="form-control"
                  autoComplete="current-password"
                  required
                  maxLength={60}
                />
                {
                  <button
                    type="button"
                    //onClick={linkEvent(this, this.handlePasswordReset)}
                    className="btn p-0 btn-link d-inline-block float-right text-muted small font-weight-bold pointer-events not-allowed"
                    //disabled={!validEmail(this.state.loginForm.username_or_email)}
                    title={i18n.t("no_password_reset")}
                  >
                    <a href="/signup">{i18n.t("forgot_password")}</a>
                  </button>
                }
              </div>
            </div>
            <div className="form-group row">
              <div className="col-sm-10">
                <button type="submit" className="btn btn-secondary">
                  {this.state.loginLoading ? <Spinner /> : i18n.t("login")}
                </button>
              </div>
              <hr />
              {this.isPiBrowser && (
                <div className="col-sm-10">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={linkEvent(this, this.handlePiLoginSubmit)}
                  >
                    {this.state.loginLoading ? (
                      <Spinner />
                    ) : (
                      "Login TEST (Do not use)"
                    )}
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      );
    } else {
      return (
        <div className="col-sm-10">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={linkEvent(this, this.handlePiLoginSubmit)}
          >
            {this.state.loginLoading ? <Spinner /> : i18n.t("Login")}
          </button>
        </div>
      );
    }
  }

  handleLoginSubmit(i: Login, event: any) {
    event.preventDefault();
    i.setState({ loginLoading: true });
    WebSocketService.Instance.send(wsClient.login(i.state.loginForm));
  }

  handleLoginUsernameChange(i: Login, event: any) {
    i.state.loginForm.username_or_email = event.target.value;
    i.setState(i.state);
  }

  handleLoginPasswordChange(i: Login, event: any) {
    i.state.loginForm.password = event.target.value;
    i.setState(i.state);
  }

  handlePasswordReset(i: Login, event: any) {
    event.preventDefault();
    let resetForm = new PasswordReset({
      email: i.state.loginForm.username_or_email,
    });
    WebSocketService.Instance.send(wsClient.passwordReset(resetForm));
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      this.setState(this.emptyState);
      return;
    } else {
      if (op == UserOperation.Login) {
        let data = wsJsonToRes<LoginResponse>(msg, LoginResponse);
        this.setState(this.emptyState);
        UserService.Instance.login(data);
        // WebSocketService.Instance.send(
        //   wsClient.userJoin({
        //     auth: auth().unwrap(),
        //   })
        // );
        //toast(i18n.t("logged_in"));
        this.props.history.push("/");
        location.reload();
      } else if (op == UserOperation.PiLogin) {
        // TODO: UUID check
        let data = wsJsonToRes<LoginResponse>(msg, LoginResponse);
        //this.state = this.emptyState;
        this.setState(this.emptyState);
        UserService.Instance.login(data);
        // WebSocketService.Instance.send(
        //   wsClient.userJoin({
        //     auth: auth().unwrap(),
        //   })
        // );
        //toast(i18n.t("logged_in"));
        this.props.history.push("/");
        location.reload();
      } else if (op == UserOperation.PasswordReset) {
        toast(i18n.t("reset_password_mail_sent"));
      } else if (op == UserOperation.GetSite) {
        let data = wsJsonToRes<GetSiteResponse>(msg, GetSiteResponse);
        this.setState({ siteRes: data });
      }
    }
  }

  async handlePiLoginSubmit(i: Login, event: any) {
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
        console.log("Login: authenticatePiUser:" + JSON.stringify(user));
        return user;
      } catch (err) {
        console.log(err);
      }
    };

    // const onIncompletePaymentFound = async payment => {
    //   //do something with incompleted payment
    //   const { data } = await axios.post("/pi/found", {
    //     paymentid: payment.identifier,
    //     pi_username: piUser.user.username,
    //     pi_uid: piUser.user.uid,
    //     auth: null,
    //     dto: null,
    //   });

    //   if (data.status >= 200 && data.status < 300) {
    //     //payment was approved continue with flow
    //     return data;
    //   }
    // }; // Read more about this in the SDK reference

    const onIncompletePaymentFound = async payment => {
      //do something with incompleted payment
      var found = new PiPaymentFound({
        domain: Some(window.location.hostname),
        paymentid: payment.identifier,
        pi_username: piUser.user.username,
        pi_uid: Some(piUser.user.uid),
        pi_token: piUser.accessToken,
        auth: None,
        person_id: None,
        comment: None,
      });

      WebSocketService.Instance.send(wsClient.piPaymentFound(found));
      return;
    }; // Read more about this in the SDK reference

    const PiLogin = async (form: PiLoginForm) => {
      let client = new LemmyHttp(httpBase);
      return client.piLogin(form);
    };

    event.preventDefault();
    i.setState({ loginLoading: true });
    piUser = await authenticatePiUser();
    i.state.piLoginForm.ea.account = piUser.user.username;
    i.state.piLoginForm.ea.extra = Some(piUser.user.uid);
    i.state.piLoginForm.ea.token = piUser.accessToken;
    //i.state.piLoginForm.info = i.state.loginForm;
    i.setState(i.state);
    // let useHttp = false;
    // if (useHttp === true) {
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
    // console.log("Login: :" + JSON.stringify(i.state.piLoginForm));
    WebSocketService.Instance.send(wsClient.piLogin(i.state.piLoginForm));
  }
}
