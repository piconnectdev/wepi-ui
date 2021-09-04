import { Component, linkEvent } from "inferno";
import { Subscription } from "rxjs";
import {
  Login as LoginForm,
  Register,
  LoginResponse,
  UserOperation,
  PasswordReset,
  GetSiteResponse,
  GetCaptchaResponse,
  SiteView,
} from "lemmy-js-client";
import { WebSocketService, UserService } from "../services";
import {
  wsJsonToRes,
  validEmail,
  toast,
  wsSubscribe,
  isBrowser,
  setIsoData,
  wsUserOp,
  wsClient,
  authField,
  joinLemmyUrl,
} from "../utils";
import { i18n } from "../i18next";
import { HtmlTags } from "./html-tags";
import { Icon, Spinner } from "./icon";
import { T } from "inferno-i18next";

interface State {
  loginForm: LoginForm;
  registerForm: Register;
  loginLoading: boolean;
  registerLoading: boolean;
  captcha: GetCaptchaResponse;
  captchaPlaying: boolean;
  site_view: SiteView;
}

export class Login extends Component<any, State> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;

  emptyState: State = {
    loginForm: {
      username_or_email: undefined,
      password: undefined,
    },
    registerForm: {
      username: undefined,
      password: undefined,
      password_verify: undefined,
      show_nsfw: false,
      captcha_uuid: undefined,
      captcha_answer: undefined,
    },
    loginLoading: false,
    registerLoading: false,
    captcha: undefined,
    captchaPlaying: false,
    site_view: this.isoData.site_res.site_view,
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

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription.unsubscribe();
    }
  }

  get documentTitle(): string {
    return `${i18n.t("login")} - ${this.state.site_view.site.name}`;
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
        />
        <div class="row">
          <div class="col-12 col-lg-6 mb-4">{this.loginForm()}</div>
          <div class="col-12 col-lg-6">{this.registerForm()}</div>
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
            <label
              class="col-sm-2 col-form-label"
              htmlFor="login-username"
            >
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
                <a href="https://wepi.social/register">{i18n.t("forgot_password")}</a>

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

  handleRegisterSubmit(i: Login, event: any) {
    event.preventDefault();
    i.state.registerLoading = true;
    i.setState(i.state);
    WebSocketService.Instance.send(wsClient.register(i.state.registerForm));
  }

  handleRegisterUsernameChange(i: Login, event: any) {
    i.state.registerForm.username = event.target.value;
    i.setState(i.state);
  }

  handleRegisterEmailChange(i: Login, event: any) {
    i.state.registerForm.email = event.target.value;
    if (i.state.registerForm.email == "") {
      i.state.registerForm.email = undefined;
    }
    i.setState(i.state);
  }

  handleRegisterPasswordChange(i: Login, event: any) {
    i.state.registerForm.password = event.target.value;
    i.setState(i.state);
  }

  handleRegisterPasswordVerifyChange(i: Login, event: any) {
    i.state.registerForm.password_verify = event.target.value;
    i.setState(i.state);
  }

  handleRegisterShowNsfwChange(i: Login, event: any) {
    i.state.registerForm.show_nsfw = event.target.checked;
    i.setState(i.state);
  }

  handleRegisterCaptchaAnswerChange(i: Login, event: any) {
    i.state.registerForm.captcha_answer = event.target.value;
    i.setState(i.state);
  }

  handleRegenCaptcha(_i: Login, event: any) {
    event.preventDefault();
    WebSocketService.Instance.send(wsClient.getCaptcha());
  }

  handlePasswordReset(i: Login, event: any) {
    event.preventDefault();
    let resetForm: PasswordReset = {
      email: i.state.loginForm.username_or_email,
    };
    WebSocketService.Instance.send(wsClient.passwordReset(resetForm));
  }

  handleCaptchaPlay(i: Login, event: any) {
    event.preventDefault();
    let snd = new Audio("data:audio/wav;base64," + i.state.captcha.ok.wav);
    snd.play();
    i.state.captchaPlaying = true;
    i.setState(i.state);
    snd.addEventListener("ended", () => {
      snd.currentTime = 0;
      i.state.captchaPlaying = false;
      i.setState(this.state);
    });
  }

  captchaPngSrc() {
    return `data:image/png;base64,${this.state.captcha.ok.png}`;
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      this.state = this.emptyState;
      this.state.registerForm.captcha_answer = undefined;
      // Refetch another captcha
      WebSocketService.Instance.send(wsClient.getCaptcha());
      this.setState(this.state);
      return;
    } else {
      if (op == UserOperation.Login) {
        let data = wsJsonToRes<LoginResponse>(msg).data;
        this.state = this.emptyState;
        this.setState(this.state);
        UserService.Instance.login(data);
        WebSocketService.Instance.send(
          wsClient.userJoin({
            auth: authField(),
          })
        );
        toast(i18n.t("logged_in"));
        this.props.history.push("/");
      } else if (op == UserOperation.Register) {
        let data = wsJsonToRes<LoginResponse>(msg).data;
        this.state = this.emptyState;
        this.setState(this.state);
        UserService.Instance.login(data);
        WebSocketService.Instance.send(
          wsClient.userJoin({
            auth: authField(),
          })
        );
        this.props.history.push("/communities");
      } else if (op == UserOperation.GetCaptcha) {
        let data = wsJsonToRes<GetCaptchaResponse>(msg).data;
        if (data.ok) {
          this.state.captcha = data;
          this.state.registerForm.captcha_uuid = data.ok.uuid;
          this.setState(this.state);
        }
      } else if (op == UserOperation.PasswordReset) {
        toast(i18n.t("reset_password_mail_sent"));
      } else if (op == UserOperation.GetSite) {
        let data = wsJsonToRes<GetSiteResponse>(msg).data;
        this.state.site_view = data.site_view;
        this.setState(this.state);
      }
    }
  }
}
