import { Component, linkEvent } from "inferno";
import { T } from "inferno-i18next";
import {
  GetCaptchaResponse,
  GetSiteResponse,
  Login as LoginForm,
  LoginResponse,
  PasswordReset,
  Register,
  SiteView,
  UserOperation,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { UserService, WebSocketService } from "../../services";
import {
  authField,
  isBrowser,
  joinLemmyUrl,
  joinPiUrl,
  setIsoData,
  toast,
  validEmail,
  wsClient,
  wsJsonToRes,
  wsSubscribe,
  wsUserOp,
} from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";

interface State {
  loginForm: LoginForm;
  registerForm: Register;
  loginLoading: boolean;
  registerLoading: boolean;
  captcha: GetCaptchaResponse;
  captchaPlaying: boolean;
  site_view: SiteView;
}
//import { createPiRegister, createPiPayment, authenticatePiUser, openPiShareDialog, piApiResponsee } from "../../pi";
import { onIncompletePaymentFound, onReadyForApprovalRegister, onReadyForCompletionRegister, createPiRegister, authenticatePiUser, piApiResponsee } from "../../pisdk";
import axios from '../../axios';
//import pisdk from '../../axios';

export class Login extends Component<any, State> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;
  private audio: HTMLAudioElement;
  private piUser;
  //const Pi = window.Pi;
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
    const scopes = ['username','payments'];
    if (isBrowser()) {
      WebSocketService.Instance.send(wsClient.getCaptcha());      
    }
    if (this.isPiBrowser) {
        window.Pi.authenticate(scopes, onIncompletePaymentFound).then(function(auth){
        this.piUser = auth;
      });
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

  get isWePi(): boolean {
    return isBrowser() && window.location.hostname == "wepi.social";
  }
  get isPiBrowser(): boolean {
    return isBrowser() && navigator.userAgent.includes('PiBrowser') && this.piUser !== "undefined";
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
              {/* <button
                type="button"
                className="btn p-0 btn-link d-inline-block float-right text-muted small font-weight-bold pointer-events not-allowed"
                disabled={!validEmail(this.state.loginForm.username_or_email)}
                title={i18n.t("no_password_reset")}
              >
                <a href="https://wepi.social/register">{i18n.t("forgot_password")}</a>

              </button> */}
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
    if (this.isPiBrowser) {
      return (
      <form onSubmit={linkEvent(this, this.handleRegisterSubmit)}>
          <h5>{i18n.t("sign_up")}</h5>

          <div class="form-group row">
            <label class="col-sm-2 col-form-label" htmlFor="register-username">
              {i18n.t("username")}
            </label>

            <div class="col-sm-10">
              <input
                type="text"
                id="register-username"
                class="form-control"
                value={this.state.registerForm.username}
                onInput={linkEvent(this, this.handleRegisterUsernameChange)}
                required
                minLength={3}
                pattern="[a-zA-Z0-9_]+"
              />
            </div>
          </div>

          <div class="form-group row">
            <label class="col-sm-2 col-form-label" htmlFor="register-password">
              {i18n.t("password")}
            </label>
            <div class="col-sm-10">
              <input
                type="password"
                id="register-password"
                value={this.state.registerForm.password}
                autoComplete="new-password"
                onInput={linkEvent(this, this.handleRegisterPasswordChange)}
                maxLength={60}
                class="form-control"
                required
              />
            </div>
          </div>

          {this.state.captcha && (
            <div class="form-group row">
              <label class="col-sm-2" htmlFor="register-captcha">
                <span class="mr-2">{i18n.t("enter_code")}</span>
                <button
                  type="button"
                  class="btn btn-secondary"
                  onClick={linkEvent(this, this.handleRegenCaptcha)}
                  aria-label={i18n.t("captcha")}
                >
                  <Icon icon="refresh-cw" classes="icon-refresh-cw" />
                </button>
              </label>
              {this.showCaptcha()}
              <div class="col-sm-6">
                <input
                  type="text"
                  class="form-control"
                  id="register-captcha"
                  value={this.state.registerForm.captcha_answer}
                  onInput={linkEvent(
                    this,
                    this.handleRegisterCaptchaAnswerChange
                  )}
                  required
                />
              </div>
            </div>
          )}
          {/* {this.state.site_view.site.enable_nsfw && (
            <div class="form-group row">
              <div class="col-sm-10">
                <div class="form-check">
                  <input
                    class="form-check-input"
                    id="register-show-nsfw"
                    type="checkbox"
                    checked={this.state.registerForm.show_nsfw}
                    onChange={linkEvent(this, this.handleRegisterShowNsfwChange)}
                  />
                  <label class="form-check-label" htmlFor="register-show-nsfw">
                    {i18n.t("show_nsfw")}
                  </label>
                </div>
              </div>
            </div>
          )} */}
          {/* {this.isWePi && (
            <div class="mt-2 mb-0 alert alert-light" role="alert">
              <T i18nKey="lemmy_ml_registration_message">
                #<a href={joinPiUrl}>#</a>
              </T>
            </div>
          )} */}
          <div class="form-group row">
            <div class="col-sm-10">
              <button type="submit" class="btn btn-secondary">
                {this.state.registerLoading ? <Spinner /> : i18n.t("sign_up")}
              </button>
            </div>
          </div>
        </form>
      );
    } else {
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
  }

  showCaptcha() {
    return (
      <div class="col-sm-4">
        {this.state.captcha.ok && (
          <>
            <img
              class="rounded-top img-fluid"
              src={this.captchaPngSrc()}
              style="border-bottom-right-radius: 0; border-bottom-left-radius: 0;"
              alt={i18n.t("captcha")}
            />
            {this.state.captcha.ok.wav && (
              <button
                class="rounded-bottom btn btn-sm btn-secondary btn-block"
                style="border-top-right-radius: 0; border-top-left-radius: 0;"
                title={i18n.t("play_captcha_audio")}
                onClick={linkEvent(this, this.handleCaptchaPlay)}
                type="button"
                disabled={this.state.captchaPlaying}
              >
                <Icon icon="play" classes="icon-play" />
              </button>
            )}
          </>
        )}
      </div>
    );
  }

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
    var config = {
      amount: 0.01,
      memo: 'wepi:acc'+i.state.registerForm.username,
      metadata: {
          ref_id: "",
      }
  };
  // create user register info
  // var info = {
  //     username: usernameToTransfer,
  //     password: passwordToTransfer,
  //     password_verify: passwordToTransfer,
  //     show_nsfw: true,
  //     email: null,
  //     captcha_uuid: null,
  //     captcha_answer: null,
  // };
  var info = i.state.registerForm;
  info.password_verify = info.password;
  info.show_nsfw = true;
  this.createPiRegister(info, config);   
    //createPiRegister(); 
    //WebSocketService.Instance.send(wsClient.register(i.state.registerForm));
  }

  createPiRegister = async (info, config) => {
    //piApiResult = null;
        window.Pi.createPayment(config, {
        // Callbacks you need to implement - read more about those in the detailed docs linked below:
        onReadyForServerApproval: (payment_id) => this.onReadyForApprovalRegister(payment_id, info, config),
        onReadyForServerCompletion:(payment_id, txid) => this.onReadyForCompletionRegister(payment_id, txid, info, config),
        onCancel: this.onCancel,
        onError:this.onError,
      });
  }
  onReadyForApprovalRegister = async (payment_id, info, paymentConfig) => {
    //make POST request to your app server /payments/approve endpoint with paymentId in the body
    
    const { data, status } = await axios.post('/pi/agree', {
	    paymentid: payment_id,
	    pi_username: this.piUser.user.username,
	    pi_uid: this.piUser.user.uid,
	    info,
        paymentConfig
    })

    if (status === 500) {
        //there was a problem approving this payment show user body.message from server
        //alert(`${body.status}: ${body.message}`);
        return false;
    } 

    if (status === 200) {
        //payment was approved continue with flow
        return data;
    }
}

// Update or change password
onReadyForCompletionRegister = async (payment_id, txid, info, paymentConfig) => {
    //make POST request to your app server /payments/complete endpoint with paymentId and txid in the body
    const { data, status } = await axios.post('/pi/register', {
        paymentid: payment_id,
        pi_username: this.piUser.user.username,
        pi_uid: this.piUser.user.uid,
        txid,
	    info,
	    paymentConfig,
    })

    if (status === 500) {
        //there was a problem completing this payment show user body.message from server
        alert(`${data.status}: ${data.message}`);
        return false;
    } 

    if (status === 200) {
        //payment was completed continue with flow
        //piApiResult["success"] = true;
        //piApiResult["type"] = "account";
        return true;
    }
    return false;
}

  onCancel = (paymentId) => {
      console.log('Register payment cancelled', paymentId)
  }
  onError = (error, paymentId) => { 
      console.log('Register onError', error, paymentId) 
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

  handleRegenCaptcha(i: Login) {
    i.audio = null;
    i.state.captchaPlaying = false;
    i.setState(i.state);
    WebSocketService.Instance.send(wsClient.getCaptcha());
  }

  handlePasswordReset(i: Login, event: any) {
    event.preventDefault();
    let resetForm: PasswordReset = {
      email: i.state.loginForm.username_or_email,
    };
    WebSocketService.Instance.send(wsClient.passwordReset(resetForm));
  }

  handleCaptchaPlay(i: Login) {
    // This was a bad bug, it should only build the new audio on a new file.
    // Replays would stop prematurely if this was rebuilt every time.
    if (i.audio == null) {
      let base64 = `data:audio/wav;base64,${i.state.captcha.ok.wav}`;
      i.audio = new Audio(base64);
    }

    i.audio.play();

    i.state.captchaPlaying = true;
    i.setState(i.state);

    i.audio.addEventListener("ended", () => {
      i.audio.currentTime = 0;
      i.state.captchaPlaying = false;
      i.setState(i.state);
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
