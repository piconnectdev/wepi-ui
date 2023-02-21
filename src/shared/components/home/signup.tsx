import { Options, passwordStrength } from "check-password-strength";
import { I18nKeys } from "i18next";
import { Component, linkEvent } from "inferno";
import { T } from "inferno-i18next-dess";
import {
  CaptchaResponse,
  ExternalAccount,
  GetCaptchaResponse,
  GetSiteResponse,
  Login as LoginForm,
  LoginResponse,
  PiAgreeRegister,
  PiLogin as PiLoginForm,
  PiPaymentFound,
  PiRegister,
  PiRegisterWithFee,
  Register,
  RegistrationMode,
  SiteView,
  UserOperation,
  Web3Login as Web3LoginForm,
  Web3Register,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { UserService, WebSocketService } from "../../services";
import {
  isBrowser,
  joinLemmyUrl,
  joinPiUrl,
  mdToHtml,
  setIsoData,
  toast,
  utf8ToHex,
  validEmail,
  wsClient,
  wsSubscribe,
} from "../../utils";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { MarkdownTextArea } from "../common/markdown-textarea";
const passwordStrengthOptions: Options<string> = [
  {
    id: 0,
    value: "very_weak",
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
  web3LoginForm: Web3LoginForm;
  web3RegisterForm: Web3Register;
  form: Register;
  // form: {
  //   username?: string;
  //   email?: string;
  //   password?: string;
  //   password_verify?: string;
  //   show_nsfw: boolean;
  //   captcha_uuid?: string;
  //   captcha_answer?: string;
  //   honeypot?: string;
  //   answer?: string;
  // };
  registerLoading: boolean;
  captcha?: GetCaptchaResponse;
  captchaPlaying: boolean;
  piBrowser: boolean;
  token?: GetCaptchaResponse;
  siteRes: GetSiteResponse;
}

export class Signup extends Component<any, State> {
  private isoData = setIsoData(this.context);
  private subscription?: Subscription;
  private audio?: HTMLAudioElement;
  state: State = {
    token: undefined,
    piLoginForm: {
      domain: undefined,
      ea: {
        account: "",
        token: "",
        epoch: 0,
        signature: undefined,
        provider: undefined,
        extra: undefined,
        uuid: undefined,
      },
      info: undefined,
    },
    form: {
      username: "",
      password: "",
      password_verify: "",
      show_nsfw: false,
      captcha_uuid: undefined,
      captcha_answer: undefined,
      honeypot: undefined,
      answer: undefined,
      email: undefined,
    },
    web3LoginForm: {
      account: "",
      signature: undefined,
      token: "",
      epoch: 0,
      info: undefined,
    },
    web3RegisterForm: {
      ea: {
        account: "",
        token: "",
        epoch: 0,
        signature: undefined,
        provider: undefined,
        extra: undefined,
        uuid: undefined,
      },
      info: {
        username: "",
        password: "",
        password_verify: "",
        show_nsfw: false,
        captcha_uuid: undefined,
        captcha_answer: undefined,
        honeypot: undefined,
        answer: undefined,
        email: undefined,
      },
    },
    registerLoading: false,
    captchaPlaying: false,
    piBrowser: false,
    siteRes: this.isoData.site_res,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleAnswerChange = this.handleAnswerChange.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    if (isBrowser()) {
      WebSocketService.Instance.send(wsClient.getCaptcha());
      WebSocketService.Instance.send(wsClient.getToken());
    }
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription?.unsubscribe();
    }
  }

  get documentTitle(): string {
    let siteView = this.state.siteRes.site_view;
    return `${this.titleName(siteView)} - ${siteView.site.name}`;
  }

  titleName(siteView: SiteView): string {
    return i18n.t(
      siteView.local_site.private_instance ? "apply_to_join" : "sign_up"
    );
  }

  get isLemmyMl(): boolean {
    return isBrowser() && window.location.hostname == "lemmy.ml";
  }

  get isWePi(): boolean {
    return isBrowser() && window.location.hostname == "wepi.social";
  }

  get isPiBrowser(): boolean {
    //return true;
    //return isBrowser() && navigator.userAgent.includes("PiBrowser");
    if (typeof window !== "undefined") {
      let value = window.navigator.userAgent.includes("PiBrowser");
      // if (typeof this.state !== "undefined") {
      //   this.setState({ piBrowser: value });
      // }
      console.log(
        "PiBrower:" + value + ", Agent " + window.navigator.userAgent
      );
      return window.navigator.userAgent.includes("PiBrowser");
    }
    return isBrowser() && navigator.userAgent.includes("PiBrowser");
  }

  get useExtSignUp(): boolean {
    return false;
  }

  get enableEmail(): boolean {
    return true;
  }

  render() {
    return (
      <div className="container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <div className="row">
          <div className="col-12 col-lg-6 offset-lg-3">
            {this.registerForm()}
          </div>
        </div>
      </div>
    );
  }

  registerForm() {
    let siteView = this.state.siteRes.site_view;
    let isPiBrowserLocal = this.isPiBrowser;
    return (
      <form onSubmit={linkEvent(this, this.handleRegisterSubmit)}>
        <h5>{this.titleName(siteView)}</h5>

        {this.isLemmyMl && (
          <div className="form-group row">
            <div className="mt-2 mb-0 alert alert-warning" role="alert">
              <T i18nKey="lemmy_ml_registration_message">
                #<a href={joinLemmyUrl}>#</a>
              </T>
            </div>
          </div>
        )}

        <div className="form-group row">
          <label
            className="col-sm-2 col-form-label"
            htmlFor="register-username"
          >
            {i18n.t("username")}
          </label>

          <div className="col-sm-10">
            {/* Add Force lowwercase */}
            <input
              type="text"
              id="register-username"
              className="form-control"
              value={this.state.form.username}
              onInput={linkEvent(this, this.handleRegisterUsernameChange)}
              required
              minLength={3}
              //pattern="[a-z0-9_]+"
              title={i18n.t("community_reqs")}
              placeholder={i18n.t("Choose an username for desktop login")}
            />
          </div>
        </div>

        <div className="form-group row">
          <label className="col-sm-2 col-form-label" htmlFor="register-email">
            {i18n.t("email")}
          </label>
          <div className="col-sm-10">
            <input
              type="email"
              id="register-email"
              className="form-control"
              placeholder={
                siteView.local_site.require_email_verification
                  ? i18n.t("required")
                  : i18n.t("optional")
              }
              value={this.state.form.email}
              autoComplete="email"
              onInput={linkEvent(this, this.handleRegisterEmailChange)}
              required={siteView.local_site.require_email_verification}
              minLength={3}
            />
            {!siteView.local_site.require_email_verification &&
              this.state.form.email &&
              !validEmail(this.state.form.email) && (
                <div className="mt-2 mb-0 alert alert-warning" role="alert">
                  <Icon icon="alert-triangle" classes="icon-inline mr-2" />
                  {i18n.t("no_password_reset")}
                </div>
              )}
          </div>
        </div>

        <div className="form-group row">
          <label
            className="col-sm-2 col-form-label"
            htmlFor="register-password"
          >
            {i18n.t("password")}
          </label>
          <div className="col-sm-10">
            <input
              type="password"
              id="register-password"
              value={this.state.form.password}
              autoComplete="new-password"
              onInput={linkEvent(this, this.handleRegisterPasswordChange)}
              minLength={10}
              maxLength={60}
              className="form-control"
              required
            />
            {this.state.form.password && (
              <div className={this.passwordColorClass}>
                {i18n.t(this.passwordStrength as I18nKeys)}
              </div>
            )}
          </div>
        </div>

        {/* <div className="form-group row">
          <label
            className="col-sm-2 col-form-label"
            htmlFor="register-verify-password"
          >
            {i18n.t("verify_password")}
          </label>
          <div className="col-sm-10">
            <input
              type="password"
              id="register-verify-password"
              value={this.state.form.password_verify}
              autoComplete="new-password"
              onInput={linkEvent(this, this.handleRegisterPasswordVerifyChange)}
              maxLength={60}
              className="form-control"
              required
            />
          </div>
        </div> */}

        {!this.isPiBrowser && true && (
          <>
            <div className="form-group row">
              <div className="offset-sm-2 col-sm-10">
                <div className="mt-2 alert alert-warning" role="alert">
                  <Icon icon="star" classes="icon-inline mr-2" />
                  {/* {i18n.t("fill_out_application")} */}
                  To join this server, you must:
                  <br />
                  1. <a href={joinPiUrl}>Join Pi Network</a>
                  <br />
                  2. Use Pi Browser to register an account.
                  <br />
                  3. Username should not the same as Pi Network account.
                </div>
                <div className="mt-2 alert alert-warning" role="alert">
                  <Icon icon="cake" classes="icon-inline mr-2" />
                  REWARD
                  <br />
                  1. Everyone can push Posts, Comments ... to Pi Network
                  blockchain and get reward.
                  <br />
                  2. Members get reward when they contribute contents and
                  someone push it to blockchain.
                </div>
                {/* {siteView.local_site.application_question.match({
                  some: question => (
                    <div
                      className="md-div"
                      dangerouslySetInnerHTML={mdToHtml(question)}
                    />
                  ),
                  none: <></>,
                })} */}
              </div>
            </div>

            <div className="form-group row">
              <label
                className="col-sm-2 col-form-label"
                htmlFor="application_answer"
              >
                {/* {i18n.t("answer")} */}
              </label>
              {/* <div className="col-sm-10">
                <MarkdownTextArea
                  initialContent={None}
                  initialLanguageId={None}
                  placeholder={None}
                  buttonTitle={None}
                  maxLength={None}
                  onContentChange={this.handleAnswerChange}
                  hideNavigationWarnings
                  allLanguages={[]}
                />
              </div> */}
            </div>
          </>
        )}

        {siteView.local_site.registration_mode ==
          RegistrationMode.RequireApplication && (
          <>
            <div className="form-group row">
              <div className="offset-sm-2 col-sm-10">
                <div className="mt-2 alert alert-warning" role="alert">
                  <Icon icon="alert-triangle" classes="icon-inline mr-2" />
                  {i18n.t("fill_out_application")}
                </div>
                {siteView.local_site.application_question && (
                  <div
                    className="md-div"
                    dangerouslySetInnerHTML={mdToHtml(
                      siteView.local_site.application_question
                    )}
                  />
                )}
              </div>
            </div>

            <div className="form-group row">
              <label
                className="col-sm-2 col-form-label"
                htmlFor="application_answer"
              >
                {i18n.t("answer")}
              </label>
              <div className="col-sm-10">
                <MarkdownTextArea
                  onContentChange={this.handleAnswerChange}
                  hideNavigationWarnings
                  allLanguages={[]}
                  siteLanguages={[]}
                />
              </div>
            </div>
          </>
        )}

        {this.state.captcha && (
          <div className="form-group row">
            <label className="col-sm-2" htmlFor="register-captcha">
              <span className="mr-2">{i18n.t("enter_code")}</span>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={linkEvent(this, this.handleRegenCaptcha)}
                aria-label={i18n.t("captcha")}
              >
                <Icon icon="refresh-cw" classes="icon-refresh-cw" />
              </button>
            </label>
            {this.showCaptcha()}
            <div className="col-sm-6">
              <input
                type="text"
                className="form-control"
                id="register-captcha"
                value={this.state.form.captcha_answer}
                onInput={linkEvent(
                  this,
                  this.handleRegisterCaptchaAnswerChange
                )}
                required
              />
            </div>
          </div>
        )}
        {siteView.local_site.enable_nsfw && (
          <div className="form-group row">
            <div className="col-sm-10">
              <div className="form-check">
                <input
                  className="form-check-input"
                  id="register-show-nsfw"
                  type="checkbox"
                  checked={this.state.form.show_nsfw}
                  onChange={linkEvent(this, this.handleRegisterShowNsfwChange)}
                />
                <label
                  className="form-check-label"
                  htmlFor="register-show-nsfw"
                >
                  {i18n.t("show_nsfw")}
                </label>
              </div>
            </div>
          </div>
        )}
        <input
          tabIndex={-1}
          autoComplete="false"
          name="a_password"
          type="text"
          className="form-control honeypot"
          id="register-honey"
          value={this.state.form.honeypot}
          onInput={linkEvent(this, this.handleHoneyPotChange)}
        />
        <div className="form-group row">
          <div className="col-sm-10">
            {!this.isPiBrowser && (
              <button
                type="submit"
                className="btn btn-secondary"
                // disabled={!isPiBrowserLocal}
              >
                {this.state.registerLoading ? (
                  <Spinner />
                ) : (
                  //this.titleName(siteView)
                  "Wallet " + this.titleName(siteView)
                  // disabled={true}
                )}
              </button>
            )}
            {this.isPiBrowser && (
              <button type="submit" className="btn btn-secondary">
                {this.state.registerLoading ? (
                  <Spinner />
                ) : (
                  this.titleName(siteView)
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    );
  }

  showCaptcha() {
    let captchaRes = this.state.captcha?.ok;
    return captchaRes ? (
      <div className="col-sm-4">
        <>
          <img
            className="rounded-top img-fluid"
            src={this.captchaPngSrc(captchaRes)}
            style="border-bottom-right-radius: 0; border-bottom-left-radius: 0;"
            alt={i18n.t("captcha")}
          />
          {captchaRes.wav && (
            <button
              className="rounded-bottom btn btn-sm btn-secondary btn-block"
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
      </div>
    ) : (
      <></>
    );
  }

  get passwordStrength(): string | undefined {
    let password = this.state.form.password;
    return password
      ? passwordStrength(password, passwordStrengthOptions).value
      : undefined;
  }

  get passwordColorClass(): string {
    let strength = this.passwordStrength;

    if (strength && ["weak", "medium"].includes(strength)) {
      return "text-warning";
    } else if (strength == "strong") {
      return "text-success";
    } else {
      return "text-danger";
    }
  }

  handleRegisterSubmit(i: Signup, event: any) {
    console.log("handleRegisterSubmit");
    if (event) event.preventDefault();
    i.setState({ registerLoading: true });
    i.setState(i.state);
    let isPi = i.isPiBrowser;
    const { ethereum } = window;
    let isMetaMaks = Boolean(ethereum && ethereum.isMetaMask);
    if (isPi) {
      i.handlePiRegisterLoginFree(i, event);
      //i.handlePiRegisterWithFee(i, event);
      return;
    } else if (isMetaMaks) {
      //i.handleWeb3RegisterLoginFree(i, event);
      i.handleWeb3RegisterFree(i, event);
      return;
    } else {
      //i.setState({ registerLoading: true });
      let cForm = i.state.form;
      if (cForm.username && cForm.password && cForm.password_verify) {
        let form: Register = {
          username: cForm.username,
          password: cForm.password,
          password_verify: cForm.password_verify,
          email: cForm.email,
          show_nsfw: cForm.show_nsfw,
          captcha_uuid: cForm.captcha_uuid,
          captcha_answer: cForm.captcha_answer,
          honeypot: cForm.honeypot,
          answer: cForm.answer,
        };
        WebSocketService.Instance.send(wsClient.register(form));
      }
    }
  }

  handleRegisterUsernameChange(i: Signup, event: any) {
    i.state.form.username = event.target.value;
    i.setState(i.state);
  }

  handleRegisterEmailChange(i: Signup, event: any) {
    i.state.form.email = event.target.value;
    if (i.state.form.email == "") {
      i.state.form.email = undefined;
    }
    i.setState(i.state);
  }

  handleRegisterPasswordChange(i: Signup, event: any) {
    i.state.form.password = event.target.value;
    i.setState(i.state);
  }

  handleRegisterPasswordVerifyChange(i: Signup, event: any) {
    i.state.form.password_verify = event.target.value;
    i.setState(i.state);
  }

  handleRegisterShowNsfwChange(i: Signup, event: any) {
    i.state.form.show_nsfw = event.target.checked;
    i.setState(i.state);
  }

  handleRegisterCaptchaAnswerChange(i: Signup, event: any) {
    i.state.form.captcha_answer = event.target.value;
    i.setState(i.state);
  }

  handleAnswerChange(val: string) {
    this.setState(s => ((s.form.answer = val), s));
  }

  handleHoneyPotChange(i: Signup, event: any) {
    i.state.form.honeypot = event.target.value;
    i.setState(i.state);
  }

  handleRegenCaptcha(i: Signup) {
    i.audio = undefined;
    i.setState({ captchaPlaying: false });
    WebSocketService.Instance.send(wsClient.getCaptcha());
  }

  handleCaptchaPlay(i: Signup) {
    // This was a bad bug, it should only build the new audio on a new file.
    // Replays would stop prematurely if this was rebuilt every time.
    let captchaRes = i.state.captcha?.ok;
    if (captchaRes) {
      if (!i.audio) {
        let base64 = `data:audio/wav;base64,${captchaRes.wav}`;
        i.audio = new Audio(base64);
        i.audio.play();

        i.setState({ captchaPlaying: true });

        i.audio.addEventListener("ended", () => {
          if (i.audio) {
            i.audio.currentTime = 0;
            i.setState({ captchaPlaying: false });
          }
        });
      }
    }
  }

  captchaPngSrc(captcha: CaptchaResponse) {
    return `data:image/png;base64,${captcha.png}`;
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(JSON.stringify(msg));
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      this.setState(s => ((s.form.captcha_answer = undefined), s));
      this.setState({ registerLoading: false });
      // Refetch another captcha
      // WebSocketService.Instance.send(wsClient.getCaptcha());
      return;
    } else {
      if (op == UserOperation.Register) {
        let data = wsJsonToRes<LoginResponse>(msg);
        // Only log them in if a jwt was set
        if (data.jwt) {
          UserService.Instance.login(data);
          this.props.history.push("/communities");
          location.reload();
        } else {
          if (data.verify_email_sent) {
            toast(i18n.t("verify_email_sent"));
          }
          if (data.registration_created) {
            toast(i18n.t("registration_application_sent"));
          }
          this.props.history.push("/");
        }
      } else if (op == UserOperation.GetCaptcha) {
        let data = wsJsonToRes<GetCaptchaResponse>(msg);
        if (data.ok) {
          this.setState({ captcha: data });
          this.setState(s => ((s.form.captcha_uuid = data.ok?.uuid), s));
        }
      } else if (op == UserOperation.PasswordReset) {
        toast(i18n.t("reset_password_mail_sent"));
      } else if (op == UserOperation.GetSite) {
        let data = wsJsonToRes<GetSiteResponse>(msg);
        this.setState({ siteRes: data });
      } else if (op == UserOperation.GetToken) {
        let data = wsJsonToRes<GetCaptchaResponse>(msg);
        if (data.ok) {
          this.setState({ token: data });
          let uuid = data.ok?.uuid;
          this.setState(s => ((s.web3RegisterForm.ea.token = uuid), s));
        }
      } else if (op == UserOperation.Web3Register) {
        this.setState({ registerLoading: false });
        let data = wsJsonToRes<LoginResponse>(msg);
        //this.setState(this.emptyState);
        // Only log them in if a jwt was set
        if (data.jwt) {
          UserService.Instance.login(data);
          this.props.history.push("/communities");
          location.reload();
        } else {
          if (data.verify_email_sent) {
            toast(i18n.t("verify_email_sent"));
          }
          if (data.registration_created) {
            toast(i18n.t("registration_application_sent"));
          }
          this.props.history.push("/");
        }
      } else if (op == UserOperation.PiRegister) {
        this.setState({ registerLoading: false });
        let data = wsJsonToRes<LoginResponse>(msg);
        //this.setState(this.emptyState);
        // Only log them in if a jwt was set
        if (data.jwt) {
          UserService.Instance.login(data);
          this.props.history.push("/communities");
          location.reload();
        } else {
          if (data.verify_email_sent) {
            toast(i18n.t("verify_email_sent"));
          }
          if (data.registration_created) {
            toast(i18n.t("registration_application_sent"));
          }
          this.props.history.push("/");
        }
      } else if (op == UserOperation.PiRegisterWithFee) {
        let data = wsJsonToRes<LoginResponse>(msg);
        //this.setState(this.emptyState);
        // Only log them in if a jwt was set
        if (data.jwt) {
          UserService.Instance.login(data);
          this.props.history.push("/communities");
          location.reload();
        } else {
          if (data.verify_email_sent) {
            toast(i18n.t("verify_email_sent"));
          }
          if (data.registration_created) {
            toast(i18n.t("registration_application_sent"));
          }
          this.props.history.push("/");
        }
      }
    }
  }

  async handleWeb3RegisterLoginFree(i: Signup, event: any) {
    const { ethereum } = window;
    var accounts = await ethereum.request({
      method: "eth_requestAccounts",
    });
    if (i.state.form.captcha_uuid) {
      //i.state.web3LoginForm.token = res;
    }
    i.state.web3LoginForm.account = ethereum.selectedAddress;
    let login: LoginForm = {
      username_or_email: i.state.form.username,
      password: i.state.form.password,
    };
    i.state.web3LoginForm.info = login;

    i.state.web3LoginForm.epoch = new Date().getTime();
    let text =
      "LOGIN:" +
      i.state.form.username +
      ";TOKEN:" +
      i.state.web3LoginForm.token +
      ";TIME:" +
      i.state.web3LoginForm.epoch;
    ethereum
      .request({
        method: "personal_sign",
        params: [`0x${utf8ToHex(text)}`, ethereum.selectedAddress],
      })
      .then(signature => {
        i.state.web3LoginForm.signature = signature;
        //console.log(JSON.stringify(i.state.web3LoginForm));
        WebSocketService.Instance.send(
          wsClient.web3Login(i.state.web3LoginForm)
        );
      })
      .catch(error => console.error(error));
  }

  async handleWeb3RegisterFree(i: Signup, event: any) {
    const { ethereum } = window;
    var accounts = await ethereum.request({
      method: "eth_requestAccounts",
    });
    i.state.web3RegisterForm.ea.account = ethereum.selectedAddress;
    i.state.form.password_verify = i.state.form.password;
    i.state.web3RegisterForm.info = i.state.form;
    i.state.web3RegisterForm.ea.epoch = new Date().getTime();
    let text =
      "LOGIN:" +
      i.state.web3RegisterForm.ea.account +
      ";TOKEN:" +
      i.state.web3RegisterForm.ea.token +
      ";TIME:" +
      i.state.web3RegisterForm.ea.epoch;
    console.log(text);
    ethereum
      .request({
        method: "personal_sign",
        params: [`0x${utf8ToHex(text)}`, ethereum.selectedAddress],
      })
      .then(_signature => {
        i.state.web3RegisterForm.ea.signature = _signature.toString();

        i.setState(i.state);
        WebSocketService.Instance.send(
          wsClient.web3Register(i.state.web3RegisterForm)
        );
      })
      .catch(error => console.error(error));
  }

  async handlePiRegisterLoginFree(i: Signup, event: any) {
    var piUser;

    const authenticatePiUser = async () => {
      // Identify the user with their username / unique network-wide ID, and get permission to request payments from them.
      const scopes = ["username", "payments", "wallet_address"];
      try {
        var user = await window.Pi.authenticate(
          scopes,
          onIncompletePaymentFound
        );
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
      //let client = new LemmyHttp(httpBase);
      //return client.piPaymentFound(found);
      console.log(JSON.stringify(found));
      WebSocketService.Instance.send(wsClient.piPaymentFound(found));
      return;
    }; // Read more about this in the SDK reference

    piUser = await authenticatePiUser();
    if (piUser == undefined) {
      toast("Pi Network Server error");
      return;
    }

    if (event) event.preventDefault();

    i.state.form.password_verify = i.state.form.password;
    i.setState(i.state);
    var ea = new ExternalAccount();
    ea.account = piUser.user.username;
    ea.token = piUser.accessToken;
    ea.uuid = piUser.user.uid;

    ea.epoch = 0;
    (ea.signature = undefined),
      (ea.provider = "PiNetwork"),
      (ea.extra = undefined);

    var piRegisterForm = new PiRegister();
    piRegisterForm.domain = window.location.hostname;
    piRegisterForm.info = i.state.form;
    piRegisterForm.ea = ea;

    i.setState({ registerLoading: true });
    i.setState(i.state);
    WebSocketService.Instance.send(wsClient.piRegister(piRegisterForm));
  }

  async handlePiRegisterWithFee(i: Signup, event: any) {
    if (!i.isPiBrowser) return;
    if (i.isPiBrowser) return;
    if (event) event.preventDefault();
    i.setState({ registerLoading: true });
    i.setState(i.state);
    var config = {
      amount: 0.1,
      memo: "register",
      metadata: {
        host: window.location.hostname,
        ref_id: "",
      },
    };

    var piUser;

    const authenticatePiUser = async () => {
      // Identify the user with their username / unique network-wide ID, and get permission to request payments from them.
      const scopes = ["username", "payments", "wallet_address"];
      try {
        var user = await window.Pi.authenticate(
          scopes,
          onIncompletePaymentFound
        );
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
      //WebSocketService.Instance.send(wsClient.piPaymentFound(found));
      return;
    }; // Read more about this in the SDK reference

    const onReadyForApprovalRegister = async (
      payment_id,
      info,
      paymentConfig
    ) => {
      var ea = new ExternalAccount();
      ea.account = piUser.user.username;
      ea.token = piUser.accessToken;
      ea.epoch = 0;
      ea.signature = undefined;
      ea.provider = "PiNetwork";
      (ea.extra = undefined), (ea.uuid = piUser.user.uid);

      var agree = new PiAgreeRegister();
      agree.domain = window.location.hostname;
      agree.ea = ea;
      agree.info = info;
      (agree.paymentid = payment_id.toString()),
        WebSocketService.Instance.send(wsClient.piAgree(agree));
    };

    const onReadyForCompletionRegister = (
      payment_id,
      txid,
      info,
      paymentConfig
    ) => {
      var ea = new ExternalAccount();

      ea.account = piUser.user.username;
      ea.token = piUser.accessToken;
      ea.epoch = 0;
      ea.signature = piUser.user.uid;
      ea.provider = "PiNetwork";
      ea.extra = undefined;
      ea.uuid = piUser.user.uid;

      var reg = new PiRegisterWithFee();

      reg.domain = window.location.hostname;
      reg.ea = ea;
      reg.info = info;
      reg.paymentid = payment_id;
      reg.txid = txid;

      WebSocketService.Instance.send(wsClient.piRegisterWithFee(reg));
      return true;
    };

    const onCancel = paymentId => {
      console.log("Pi Payment cancelled", paymentId);
      i.setState({ registerLoading: false });
      i.setState(i.state);
    };

    const onError = (error, paymentId) => {
      console.log(
        "Pi Register error " + paymentId + " - " + +JSON.stringify(error)
      );
      i.setState({ registerLoading: false });
      i.setState(i.state);
    };

    const createPiRegister = async (info, config) => {
      window.Pi.createPayment(config, {
        // Callbacks you need to implement - read more about those in the detailed docs linked below:
        onReadyForServerApproval: payment_id =>
          onReadyForApprovalRegister(payment_id, info, config),
        onReadyForServerCompletion: (payment_id, txid) =>
          onReadyForCompletionRegister(payment_id, txid, info, config),
        onCancel: onCancel,
        onError: onError,
      });
    };

    var info = i.state.form;
    info.password_verify = info.password;
    info.show_nsfw = true;

    try {
      piUser = await authenticatePiUser();
      if (piUser == undefined) {
        i.setState({ registerLoading: false });
        return;
      }
      await createPiRegister(info, config);
    } catch (err) {
      i.setState({ registerLoading: false });
      i.setState(i.state);
      console.log("Pi Register error+" + JSON.stringify(err));
    }
  }
}
