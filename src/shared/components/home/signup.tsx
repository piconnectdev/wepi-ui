import { Component, linkEvent } from "inferno";
import { T } from "inferno-i18next-dess";
import {
  GetCaptchaResponse,
  GetSiteResponse,
  LoginResponse,
  Login as LoginForm,
  PiLogin as PiLoginForm,
  Register,
  SiteView,
  UserOperation,
  LemmyHttp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { Options, passwordStrength } from "check-password-strength";
import { UserService, WebSocketService } from "../../services";
import {
  authField,
  isBrowser,
  joinLemmyUrl,
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
import {I18nKeys} from "i18next";
import axios from '../../axios';
import {httpBase} from "../../../shared/env";

const passwordStrengthOptions: Options<string> = [
  {
    id: 0,
    value: "too_weak",
    minDiversity: 0,
    minLength: 0,
  },
  {
    id: 1,
    value: "weak",
    minDiversity: 2,
    minLength: 10,
  },
  {
    id: 2,
    value: "medium",
    minDiversity: 3,
    minLength: 12,
  },
  {
    id: 3,
    value: "strong",
    minDiversity: 4,
    minLength: 14,
  },
];

interface State {
  piLoginForm: PiLoginForm;
  registerForm: Register;
  registerLoading: boolean;
  captcha: GetCaptchaResponse;
  captchaPlaying: boolean;
  site_view: SiteView;
}

export class Signup extends Component<any, State> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;
  private audio: HTMLAudioElement;

  emptyState: State = {
    piLoginForm: {
      pi_username: undefined,
      pi_uid: undefined,
      pi_token: undefined,
      info: undefined,
    }, 
    registerForm: {
      username: undefined,
      password: undefined,
      password_verify: undefined,
      show_nsfw: false,
      captcha_uuid: undefined,
      captcha_answer: undefined,
    },
    registerLoading: false,
    captcha: undefined,
    captchaPlaying: false,
    site_view: this.isoData.site_res.site_view,
  };

  constructor(props: any, context: any) {
    super(props, context);

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

  get isWePi(): boolean {
    return isBrowser() && window.location.hostname == "wepi.social";
  }

  get isPiBrowser(): boolean {
    return isBrowser() && navigator.userAgent.includes('PiBrowser');
  }

  get useExtSignUp(): boolean {
    return false;
  }

  get enableEmail(): boolean {
    return true;
  }

  render() {
    return (
      <div class="container">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <div class="row">
          <div class="col-12 col-lg-6 offset-lg-3">{this.registerForm()}</div>
        </div>
      </div>
    );
  }

  registerForm() {
    if (!this.useExtSignUp) { 
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
              title={i18n.t("community_reqs")}
            />
          </div>
        </div>

        {!this.isPiBrowser && this.enableEmail && ( 
          <div class="form-group row">
            <label class="col-sm-2 col-form-label" htmlFor="register-email">
              {i18n.t("email")}
            </label>
            <div class="col-sm-10">
              <input
                type="email"
                id="register-email"
                class="form-control"
                placeholder={i18n.t("optional")}
                value={this.state.registerForm.email}
                autoComplete="email"
                onInput={linkEvent(this, this.handleRegisterEmailChange)}
                minLength={3}
              />
              {!validEmail(this.state.registerForm.email) && (
                <div class="mt-2 mb-0 alert alert-light" role="alert">
                  <Icon icon="alert-triangle" classes="icon-inline mr-2" />
                  {i18n.t("no_password_reset")}
                </div>
              )}
            </div>
          </div> 
        )}

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
              minLength={10}
              maxLength={60}
              class="form-control"
              required
            />
            {this.state.registerForm.password && (
              <div class={this.passwordColorClass}>
                {i18n.t(this.passwordStrength as I18nKeys)}
              </div>
            )}
          </div>
        </div>

        {!this.isPiBrowser && (
        <div class="form-group row">
          <label
            class="col-sm-2 col-form-label"
            htmlFor="register-verify-password"
          >
            {i18n.t("verify_password")}
          </label>
          <div class="col-sm-10">
            <input
              type="password"
              id="register-verify-password"
              value={this.state.registerForm.password_verify}
              autoComplete="new-password"
              onInput={linkEvent(this, this.handleRegisterPasswordVerifyChange)}
              maxLength={60}
              class="form-control"
              required
            />
          </div>
        </div> )}

        {!this.isPiBrowser && this.state.captcha && (
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
        {!this.isPiBrowser && this.state.site_view.site.enable_nsfw && (
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
        )} 
        {/* {this.isWePi && (
          <div class="mt-2 mb-0 alert alert-light" role="alert">
            <T i18nKey="lemmy_ml_registration_message">
              #<a href={joinLemmyUrl}>#</a>
            </T>
          </div>
        )} */}
        { this.isPiBrowser && (
              <div class="mt-2 mb-0 alert alert-light" role="alert">
              {/* This will transfer 0.01 test-π to our development test wallet for registration.
              <hr/> */}
              WePi’s username and password do not need to match Pi’s username and password.
            </div>
          )}
          {/* { !this.isPiBrowser && (
           <div class="mt-2 mb-0 alert alert-light" role="alert">
              USE PI BROWSER FOR REGISTRATION
              <hr/>
              Please use in the Pi Browser. Any payments made will not be processed and this is just a simulation when ran outside of the Pi Browser.
              <hr/>
              WePi’s username and password do not need to match Pi’s username and password.
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

  get passwordStrength() {
    return passwordStrength(
      this.state.registerForm.password,
      passwordStrengthOptions
    ).value;
  }

  get passwordColorClass(): string {
    let strength = this.passwordStrength;

    if (["weak", "medium"].includes(strength)) {
      return "text-warning";
    } else if (strength == "strong") {
      return "text-success";
    } else {
      return "text-danger";
    }
  }

  handleRegisterSubmit(i: Signup, event: any) {
    if (this.isPiBrowser) {
      this.handlePiRegisterSubmit(i, event).then(()=>{
        
      });
      return;
    }

    event.preventDefault();
    i.state.registerLoading = true;
    i.setState(i.state);
    WebSocketService.Instance.send(wsClient.register(i.state.registerForm));
  }

  handleRegisterUsernameChange(i: Signup, event: any) {
    i.state.registerForm.username = event.target.value;
    i.setState(i.state);
  }

  handleRegisterEmailChange(i: Signup, event: any) {
    i.state.registerForm.email = event.target.value;
    if (i.state.registerForm.email == "") {
      i.state.registerForm.email = undefined;
    }
    i.setState(i.state);
  }

  handleRegisterPasswordChange(i: Signup, event: any) {
    i.state.registerForm.password = event.target.value;
    i.setState(i.state);
  }

  handleRegisterPasswordVerifyChange(i: Signup, event: any) {
    i.state.registerForm.password_verify = event.target.value;
    i.setState(i.state);
  }

  handleRegisterShowNsfwChange(i: Signup, event: any) {
    i.state.registerForm.show_nsfw = event.target.checked;
    i.setState(i.state);
  }

  handleRegisterCaptchaAnswerChange(i: Signup, event: any) {
    i.state.registerForm.captcha_answer = event.target.value;
    i.setState(i.state);
  }

  handleRegenCaptcha(i: Signup) {
    i.audio = null;
    i.state.captchaPlaying = false;
    i.setState(i.state);
    WebSocketService.Instance.send(wsClient.getCaptcha());
  }

  handleCaptchaPlay(i: Signup) {
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
      if (op == UserOperation.Register) {
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
      } else if (op == UserOperation.PiLogin) {
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
    }else if (op == UserOperation.GetCaptcha) {
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
 
  async handlePiRegisterSubmit(i: Signup, event: any) {

    
    var piUser;

    const authenticatePiUser = async () => {
      // Identify the user with their username / unique network-wide ID, and get permission to request payments from them.
      const scopes = ['username','payments'];      
      try {
          var user = await window.Pi.authenticate(scopes, onIncompletePaymentFound);
          return user;
      } catch(err) {
          console.log(err)
      }
    };

    const onIncompletePaymentFound = async (payment) => { 
      //do something with incompleted payment
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
    
    const PiLogin =  async (form: PiLoginForm) => {
      let client = new LemmyHttp(httpBase);
      return  client.piLogin(form);
    };

    event.preventDefault();
    i.state.registerLoading = true;
    i.setState(i.state);    
    piUser = await authenticatePiUser();
    i.state.piLoginForm.pi_username = piUser.user.username;
    i.state.piLoginForm.pi_uid = piUser.user.uid;
    i.state.piLoginForm.pi_token = piUser.accessToken;
    i.state.piLoginForm.info = {
      username_or_email: i.state.registerForm.username,
      password: i.state.registerForm.password,
    };
    i.setState(i.state);    
    let useHttp = false;
    if (useHttp===true) {
      console.log(JSON.stringify(i.state.piLoginForm));
      var data = await PiLogin(i.state.piLoginForm);
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
    } else {
      WebSocketService.Instance.send(wsClient.piLogin(i.state.piLoginForm));
    }
  }

  async handlePiRegister(i: Signup, event: any) {
    if (!this.isPiBrowser)
      return;

    var config = {
      amount: 0.01,
      memo: 'wepi:account',
      metadata: {
          ref_id: "",
      }
    };
  
    var piUser;

    const authenticatePiUser = async () => {
      // Identify the user with their username / unique network-wide ID, and get permission to request payments from them.
      const scopes = ['username','payments'];      
      try {
          var user = await window.Pi.authenticate(scopes, onIncompletePaymentFound);
          return user;
      } catch(err) {
          console.log(err)
      }
    };

    const onIncompletePaymentFound = async (payment) => { 
      //do something with incompleted payment
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

    const onReadyForApprovalRegister = async (payment_id, info, paymentConfig) => {
      //make POST request to your app server /payments/approve endpoint with paymentId in the body    
      const { data } = await axios.post('/pi/agree', {
        paymentid: payment_id,
        pi_username: piUser.user.username,
        pi_uid: piUser.user.uid,
        info,
        paymentConfig
      })
      if (data.status >= 200 && data.status < 300) {
          //payment was approved continue with flow
          return data;
      } else {
        alert("WePi approve register error:" + JSON.stringify(data));      
      }
    }

    // Update or change password
    const onReadyForCompletionRegister = (payment_id, txid, info, paymentConfig) => {
      //make POST request to your app server /payments/complete endpoint with paymentId and txid in the body
      axios.post('/pi/register', {
          paymentid: payment_id,
          pi_username: piUser.user.username,
          pi_uid: piUser.user.uid,
          txid,
          info,
          paymentConfig,
      }).then((data) => {      
        alert("WePi register payment:" + JSON.stringify(data));
        if (data.status >= 200 && data.status < 300) {
            event.preventDefault();
            i.state.registerLoading = true;
            i.setState(i.state);          
            //i.state.loginForm.username_or_email = i.state.registerForm.username;
            //i.state.loginForm.password = i.state.registerForm.password;
            //WebSocketService.Instance.send(wsClient.login(i.state.loginForm));
            var lf: LoginForm;
            lf.username_or_email = i.state.registerForm.username;
            lf.password = i.state.registerForm.password;
            WebSocketService.Instance.send(wsClient.login(lf));
            return true;
        } else {
          alert("WePi complete register error:" + JSON.stringify(data));  
          return false;
        };
      });
      return false;      
    };

    const onCancel = (paymentId) => {
        console.log('Register payment cancelled', paymentId)
    }
    
    const onError = (error, paymentId) => { 
        console.log('Register error', error, paymentId) 
        alert("WePi onError:" + JSON.stringify(error));
    }

    const createPiRegister = async (info, config) => {
      //piApiResult = null;
      alert("WePi createPiRegister:" + JSON.stringify(config));
          window.Pi.createPayment(config, {
          // Callbacks you need to implement - read more about those in the detailed docs linked below:
          onReadyForServerApproval: (payment_id) => onReadyForApprovalRegister(payment_id, info, config),
          onReadyForServerCompletion:(payment_id, txid) => onReadyForCompletionRegister(payment_id, txid, info, config),
          onCancel: onCancel,
          onError: onError,
        });
    };
        
    var info = i.state.registerForm;
    info.password_verify = info.password;
    info.show_nsfw = true;

    try {
      piUser = await authenticatePiUser();
      await createPiRegister(info, config);
    } catch(err) {
      alert("WePi register catch error:" + JSON.stringify(err));
    }
  }
}
