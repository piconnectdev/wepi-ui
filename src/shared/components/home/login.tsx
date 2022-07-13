import { None } from "@sniptt/monads";
import { Component, linkEvent } from "inferno";
import {
  GetSiteResponse,
  Login as LoginForm,
  LoginResponse,
  PasswordReset,
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
  validEmail,
  wsClient,
  wsSubscribe,
} from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";

interface State {
  loginForm: LoginForm;
  loginLoading: boolean;
  siteRes: GetSiteResponse;
}

export class Login extends Component<any, State> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;

  emptyState: State = {
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
    return this.state.siteRes.site_view.match({
      some: siteView => `${i18n.t("login")} - ${siteView.site.name}`,
      none: "",
    });
  }

  get isLemmyMl(): boolean {
    return isBrowser() && window.location.hostname == "lemmy.ml";
  }

  render() {
    return (
      <div class="container">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
          description={None}
          image={None}
        />
        <div class="row">
          <div class="col-12 col-lg-6 offset-lg-3">{this.loginForm()}</div>
        </div>
      </div>
    );
  }

  loginForm() {
    return (
      <div>
        <form onSubmit={linkEvent(this, this.handleLoginSubmit)}>
          <h5>{i18n.t("login")}</h5>
          <div class="form-group row">
            <label class="col-sm-2 col-form-label" htmlFor="login-username">
              {i18n.t("username")}
            </label>
            <div class="col-sm-10">
              <input
                type="text"
                class="form-control"
                id="login-email-or-username"
                value={this.state.loginForm.username_or_email}
                onInput={linkEvent(this, this.handleLoginUsernameChange)}
                autoComplete="email"
                required
                minLength={3}
              />
            </div>
          </div>
          <div class="form-group row">
            <label class="col-sm-2 col-form-label" htmlFor="login-password">
              {i18n.t("password")}
            </label>
            <div class="col-sm-10">
              <input
                type="password"
                id="login-password"
                value={this.state.loginForm.password}
                onInput={linkEvent(this, this.handleLoginPasswordChange)}
                class="form-control"
                autoComplete="current-password"
                required
                maxLength={60}
              />
              <button
                type="button"
                className="btn p-0 btn-link d-inline-block float-right text-muted small font-weight-bold pointer-events not-allowed"
                disabled={!validEmail(this.state.loginForm.username_or_email)}
                title={i18n.t("no_password_reset")}
              >
                <a href="https://wepi.social/register">
                  {i18n.t("forgot_password")}
                </a>
              </button>
            </div>
          </div>
          <div class="form-group row">
            <div class="col-sm-10">
              <button type="submit" class="btn btn-secondary">
                {this.state.loginLoading ? <Spinner /> : i18n.t("login")}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  registerForm() {
    // var script = document.createElement('script');
    // script.src = 'https://sdk.minepi.com/pi-sdk.js';
    // script.type = 'text/javascript';
    // var scriptPi = document.createElement('script');
    // scriptPi.src = 'Pi.init({ version: "2.0" })';
    // const scopes = ['payments'];
    //function onIncompletePaymentFound(payment) {};
    //scriptPi.authenticate(scopes, onIncompletePaymentFound).then(function(auth) {
    //   console.log(`Hi there! You're ready to make payments!`);
    // }).catch(function(error) {
    //   console.error(error);
    // });
    return (
      <form action="https://wepi.social/register">
        <div class="form-group row">
          <div class="col-sm-10">
            <button type="submit" class="btn btn-secondary">
              <a href="https://wepi.social/register">{i18n.t("sign_up")}</a>
              {/* {this.state.registerLoading ? <Spinner /> : i18n.t("sign_up") formaction */}
            </button>
          </div>
        </div>
      </form>
    );
  }

  // showCaptcha() {
  //   return (
  //     <div class="col-sm-4">
  //       {this.state.captcha.ok && (
  //         <>
  //           <img
  //             class="rounded-top img-fluid"
  //             src={this.captchaPngSrc()}
  //             style="border-bottom-right-radius: 0; border-bottom-left-radius: 0;"
  //             alt={i18n.t("captcha")}
  //           />
  //           {this.state.captcha.ok.wav && (
  //             <button
  //               class="rounded-bottom btn btn-sm btn-secondary btn-block"
  //               style="border-top-right-radius: 0; border-top-left-radius: 0;"
  //               title={i18n.t("play_captcha_audio")}
  //               onClick={linkEvent(this, this.handleCaptchaPlay)}
  //               type="button"
  //               disabled={this.state.captchaPlaying}
  //             >
  //               <Icon icon="play" classes="icon-play" />
  //             </button>
  //           )}
  //         </>
  //       )}
  //     </div>
  //   );
  // }

  handleLoginSubmit(i: Login, event: any) {
    event.preventDefault();
    i.state.loginLoading = true;
    i.setState(i.state);
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
      this.state = this.emptyState;
      this.setState(this.state);
      return;
    } else {
      if (op == UserOperation.Login) {
        let data = wsJsonToRes<LoginResponse>(msg, LoginResponse);
        this.state = this.emptyState;
        this.setState(this.state);
        UserService.Instance.login(data);
      } else if (op == UserOperation.PasswordReset) {
        toast(i18n.t("reset_password_mail_sent"));
      } else if (op == UserOperation.GetSite) {
        let data = wsJsonToRes<GetSiteResponse>(msg, GetSiteResponse);
        this.state.siteRes = data;
        this.setState(this.state);
      }
    }
  }
}
