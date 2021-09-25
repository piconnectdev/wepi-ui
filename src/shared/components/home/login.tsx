import { Component, linkEvent } from "inferno";
import {
  GetSiteResponse,
  Login as LoginForm,
  PiLogin as PiLoginForm,
  LoginResponse,
  PasswordReset,
  SiteView,
  UserOperation,
  LemmyHttp,
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
import axios from '../../axios';
import {httpBase} from "../../../shared/env";

interface State {
  piLoginForm: PiLogin;
  loginForm: LoginForm;
  loginLoading: boolean;
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
    loginLoading: false,
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

  componentDidMount() {
    // Navigate to home if already logged in
    if (UserService.Instance.myUserInfo) {
      this.context.router.history.push("/");
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
    return isBrowser() && navigator.userAgent.includes('PiBrowser');
  }

  get isForcePiAuth(): boolean {
    return true;
    //return isPiBrowser() && navigator.userAgent.includes('PiBrowser');
  }

  get useExtSignUp(): boolean {
    return true;
    //return isBrowser() && navigator.userAgent.includes('PiBrowser');
  }

  render() {
    return (
      <div class="container">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <div class="row">
          <div class="col-12 col-lg-6 offset-lg-3">{this.loginForm()}</div>
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
              <hr/>
               {/* {!this.isPiBrowser  && (
                <div class="col-sm-10">
                <button 
                type="button"
                 class="btn btn-secondary"
                 onClick={linkEvent(this, this.handlePiLoginSubmit)}
                >
                  {this.state.loginLoading ? <Spinner /> : i18n.t("Login With Pi")}
                </button>
              </div>
              )} */}
            </div>
          </form>
        </div>
      );
    } 
    else 
    {
      return (
      <div class="col-sm-10">
        <button 
        type="button"
         class="btn btn-secondary"
         onClick={linkEvent(this, this.handlePiLoginSubmit)}
        >
          {this.state.loginLoading ? <Spinner /> : i18n.t("Login")}
        </button>
      </div>
      )
    }
  }

  // registerForm() {   
  //   if (!this.useExtSignUp) { 
  //   // if (this.isPiBrowser) {
  //     return (
  //     <form onSubmit={linkEvent(this, this.handlePiRegister)}>
  //         <h5>{i18n.t("sign_up")}</h5>

  //         <div class="form-group row">
  //           <label class="col-sm-2 col-form-label" htmlFor="register-username">
  //             {i18n.t("username")}
  //           </label>

  //           <div class="col-sm-10">
  //             <input
  //               type="text"
  //               id="register-username"
  //               class="form-control"
  //               value={this.state.registerForm.username}
  //               onInput={linkEvent(this, this.handleRegisterUsernameChange)}
  //               required
  //               minLength={3}
  //               pattern="[a-zA-Z0-9_]+"
  //             />
  //           </div>
  //         </div>

  //         <div class="form-group row">
  //           <label class="col-sm-2 col-form-label" htmlFor="register-password">
  //             {i18n.t("password")}
  //           </label>
  //           <div class="col-sm-10">
  //             <input
  //               type="password"
  //               id="register-password"
  //               value={this.state.registerForm.password}
  //               autoComplete="new-password"
  //               onInput={linkEvent(this, this.handleRegisterPasswordChange)}
  //               maxLength={60}
  //               class="form-control"
  //               required
  //             />
  //           </div>
  //         </div>

  //         {this.state.captcha && (
  //           <div class="form-group row">
  //             <label class="col-sm-2" htmlFor="register-captcha">
  //               <span class="mr-2">{i18n.t("enter_code")}</span>
  //               <button
  //                 type="button"
  //                 class="btn btn-secondary"
  //                 onClick={linkEvent(this, this.handleRegenCaptcha)}
  //                 aria-label={i18n.t("captcha")}
  //               >
  //                 <Icon icon="refresh-cw" classes="icon-refresh-cw" />
  //               </button>
  //             </label>
  //             {this.showCaptcha()}
  //             <div class="col-sm-6">
  //               <input
  //                 type="text"
  //                 class="form-control"
  //                 id="register-captcha"
  //                 value={this.state.registerForm.captcha_answer}
  //                 onInput={linkEvent(
  //                   this,
  //                   this.handleRegisterCaptchaAnswerChange
  //                 )}
  //                 required
  //               />
  //             </div>
  //           </div>
  //         )}
  //         {/* {this.state.site_view.site.enable_nsfw && (
  //           <div class="form-group row">
  //             <div class="col-sm-10">
  //               <div class="form-check">
  //                 <input
  //                   class="form-check-input"
  //                   id="register-show-nsfw"
  //                   type="checkbox"
  //                   checked={this.state.registerForm.show_nsfw}
  //                   onChange={linkEvent(this, this.handleRegisterShowNsfwChange)}
  //                 />
  //                 <label class="form-check-label" htmlFor="register-show-nsfw">
  //                   {i18n.t("show_nsfw")}
  //                 </label>
  //               </div>
  //             </div>
  //           </div>
  //         )} */}
  //         { this.isPiBrowser && (
  //             <div class="mt-2 mb-0 alert alert-light" role="alert">
  //             This will transfer 0.01 test-π to our development test wallet for registration.
  //             <hr/>
  //             WePi’s username and password do not need to match Pi’s username and password.                          
  //           </div>
  //         )}
  //         { !this.isPiBrowser && (
  //          <div class="mt-2 mb-0 alert alert-light" role="alert">
  //             USE PI BROWSER FOR REGISTRATION   
  //             <hr/>
  //             This will transfer 0.01 test-π to our development test wallet for registration.
  //             <hr/>
  //             Please use in the Pi Browser. Any payments made will not be processed and this is just a simulation when ran outside of the Pi Browser.
  //             <hr/>
  //             WePi’s username and password do not need to match Pi’s username and password.                          
  //           </div>
  //         )}
  //         <div class="form-group row">
  //           <div class="col-sm-10">
  //             <button type="submit" class="btn btn-secondary">
  //               {this.state.registerLoading ? <Spinner /> : i18n.t("sign_up")}
  //             </button>
  //           </div>
  //         </div>
  //       </form>
  //     );
    // } else {
    //   return (
    //     <form action="https://wepi.social/register">
    //       <div class="form-group row">
    //         <div class="col-sm-10">
    //           <button type="submit" class="btn btn-secondary">
    //             <a href="https://wepi.social/register">{i18n.t("sign_up")}</a>
    //             {/* {this.state.registerLoading ? <Spinner /> : i18n.t("sign_up") formaction */}

    //           </button>
    //         </div>
    //       </div>

    //     </form>
    //   );
    // }


  //   return (
  //     <form action="https://wepi.social/register">
  //       <div class="form-group row">
  //         <div class="col-sm-10">
  //           <button type="submit" class="btn btn-secondary">
  //             <a href="https://wepi.social/register">{i18n.t("sign_up")}</a>
  //             {/* {this.state.registerLoading ? <Spinner /> : i18n.t("sign_up") formaction */}
  //           </button>
  //         </div>
  //       </div>
  //     </form>
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
    let resetForm: PasswordReset = {
      email: i.state.loginForm.username_or_email,
    };
    WebSocketService.Instance.send(wsClient.passwordReset(resetForm));
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      this.state = this.emptyState;
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
      } else if (op == UserOperation.PasswordReset) {
        toast(i18n.t("reset_password_mail_sent"));
      } else if (op == UserOperation.GetSite) {
        let data = wsJsonToRes<GetSiteResponse>(msg).data;
        this.state.site_view = data.site_view;
        this.setState(this.state);
      }
    }
  }
  async handlePiLoginSubmit(i: Login, event: any) {

    //if (!this.isPiBrowser)
    //  return;

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

    piUser = await authenticatePiUser();
    event.preventDefault();
    i.state.loginLoading = true;
    i.state.piLoginForm.pi_username = piUser.user.username;
    i.state.piLoginForm.pi_uid = piUser.user.uid;
    i.state.piLoginForm.pi_token = piUser.accessToken;
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

}
