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
  piLoginForm: PiLoginForm;
  loginForm: LoginForm;
  loginLoading: boolean;
  site_view: SiteView;
}

export class Login extends Component<any, State> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;

  emptyState: State = {
    piLoginForm:{
      pi_username: undefined,
      pi_uid: undefined,
      pi_token: undefined,
    },
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
               {this.isPiBrowser  && (
                <div class="col-sm-10">
                <button 
                type="button"
                 class="btn btn-secondary"
                 onClick={linkEvent(this, this.handlePiLoginSubmit)}
                >
                  {this.state.loginLoading ? <Spinner /> : "Login TEST (Do not use)"}
                </button>
              </div>
              )}
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
          return data;
      }
    }; // Read more about this in the SDK reference
    
    const PiLogin =  async (form: PiLoginForm) => {
      let client = new LemmyHttp(httpBase);
      return  client.piLogin(form);
    };

    event.preventDefault();
    i.state.loginLoading = true;

    piUser = await authenticatePiUser();
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
