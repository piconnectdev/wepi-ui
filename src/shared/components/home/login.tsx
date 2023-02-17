import { Component, linkEvent } from "inferno";
import {
  ExternalAccount,
  GetSiteResponse,
  Login as LoginI,
  LoginResponse,
  PasswordReset,
  PiLogin as PiLoginForm,
  PiPaymentFound,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
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
  form: {
    username_or_email?: string;
    password?: string;
  };
  loginLoading: boolean;
  siteRes: GetSiteResponse;
}

export class Login extends Component<any, State> {
  private isoData = setIsoData(this.context);
  private subscription?: Subscription;

  state: State = {
    form: {},
    loginLoading: false,
    siteRes: this.isoData.site_res,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    if (isBrowser()) {
      WebSocketService.Instance.send(wsClient.getCaptcha());
    }
  }

  componentDidMount() {
    // Navigate to home if already logged in
    if (UserService.Instance.myUserInfo) {
      this.context.router.history.push("/");
    }
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription?.unsubscribe();
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
      // if (window.Pi != null) {
      //   return true;
      // }
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
                htmlFor="login-email-or-username"
              >
                {i18n.t("email_or_username")}
              </label>
              <div className="col-sm-10">
                <input
                  type="text"
                  className="form-control"
                  id="login-email-or-username"
                  value={this.state.form.username_or_email}
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
                  value={this.state.form.password}
                  onInput={linkEvent(this, this.handleLoginPasswordChange)}
                  className="form-control"
                  autoComplete="current-password"
                  required
                  maxLength={60}
                />
                <button
                  type="button"
                  //onClick={linkEvent(this, this.handlePasswordReset)}
                  className="btn p-0 btn-link d-inline-block float-right text-muted small font-weight-bold pointer-events not-allowed"
                  //disabled={
                  //  !!this.state.form.username_or_email &&
                  //  !validEmail(this.state.form.username_or_email)
                  //}
                  title={i18n.t("no_password_reset")}
                >
                  <a href="/signup">{i18n.t("forgot_password")}</a>
                </button>
              </div>
            </div>
            <div className="form-group row">
              <div className="col-sm-10">
                <button type="submit" className="btn btn-secondary">
                  {this.state.loginLoading ? <Spinner /> : i18n.t("login")}
                </button>
              </div>
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
    let lForm = i.state.form;
    let username_or_email = lForm.username_or_email;
    let password = lForm.password;
    if (username_or_email && password) {
      let form: LoginI = {
        username_or_email,
        password,
      };
      WebSocketService.Instance.send(wsClient.login(form));
    }
  }

  handleLoginUsernameChange(i: Login, event: any) {
    i.state.form.username_or_email = event.target.value;
    i.setState(i.state);
  }

  handleLoginPasswordChange(i: Login, event: any) {
    i.state.form.password = event.target.value;
    i.setState(i.state);
  }

  handlePasswordReset(i: Login, event: any) {
    event.preventDefault();
    let email = i.state.form.username_or_email;
    if (email) {
      let resetForm: PasswordReset = { email };
      WebSocketService.Instance.send(wsClient.passwordReset(resetForm));
    }
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      this.setState({ loginLoading: false });
      console.log("Error:" + JSON.stringify(msg));
      //this.setState(this.state);
      //this.setState({ form: {} });
      return;
    } else {
      if (op == UserOperation.Login) {
        let data = wsJsonToRes<LoginResponse>(msg);
        UserService.Instance.login(data);
        this.props.history.push("/");
        location.reload();
      } else if (op == UserOperation.PiLogin) {
        // TODO: UUID check
        this.setState({ loginLoading: false });
        let data = wsJsonToRes<LoginResponse>(msg);
        //this.setState(this.state);
        UserService.Instance.login(data);
        this.props.history.push("/");
        location.reload();
      } else if (op == UserOperation.PasswordReset) {
        toast(i18n.t("reset_password_mail_sent"));
      } else if (op == UserOperation.GetSite) {
        let data = wsJsonToRes<GetSiteResponse>(msg);
        this.setState({ siteRes: data });
      } else {
        console.log("Unknow:" + JSON.stringify(msg));
      }
    }
  }

  async handlePiLoginSubmit(i: Login, event: any) {
    //if (!i.isPiBrowser)
    //  return;
    var piUser;

    const authenticatePiUser = async () => {
      // Identify the user with their username / unique network-wide ID, and get permission to request payments from them.
      const scopes = ["username", "payments", "wallet_address"];
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
      console.log(JSON.stringify(found));
      WebSocketService.Instance.send(wsClient.piPaymentFound(found));
      return;
    }; // Read more about this in the SDK reference

    // const PiLogin = async (form: PiLoginForm) => {
    //   let client = new LemmyHttp(httpBase);
    //   return client.piLogin(form);
    // };

    event.preventDefault();
    i.setState({ loginLoading: true });
    piUser = await authenticatePiUser();
    var ea = new ExternalAccount();
    ea.account = piUser.user.username;
    ea.token = piUser.accessToken;
    ea.epoch = 0;
    ea.signature = piUser.user.uid;
    ea.provider = "PiNetwork";
    ea.extra = undefined;
    ea.uuid = piUser.user.uid;
    let form = new PiLoginForm();
    form.domain = window.location.hostname;
    form.ea = ea;
    //form.info = null;
    // info: new LoginForm({
    //   username_or_email: ea.account,
    //   password: i.state.loginForm.password,
    // }),

    WebSocketService.Instance.send(wsClient.piLogin(form));
  }
}
