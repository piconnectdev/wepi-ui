import { myAuth, setIsoData } from "@utils/app";
import { isBrowser } from "@utils/browser";
import { validEmail } from "@utils/helpers";
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
  PiLogin,
  PiPaymentFound,
  PiRegister,
  PiRegisterWithFee,
  SiteView,
  Web3Login,
  Web3Register,
} from "lemmy-js-client";
import { utf8ToHex } from "../../../shared/pisdk";
import { joinLemmyUrl } from "../../config";
import { mdToHtml } from "../../markdown";
import { I18NextService, UserService } from "../../services";
import { HttpService, RequestState } from "../../services/HttpService";
import { toast } from "../../toast";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { MarkdownTextArea } from "../common/markdown-textarea";
import PasswordInput from "../common/password-input";

interface State {
  registerRes: RequestState<LoginResponse>;
  captchaRes: RequestState<GetCaptchaResponse>;
  //registerLoading: boolean;
  piLoginForm: PiLogin;
  web3LoginForm: Web3Login;
  web3RegisterForm: Web3Register;

  form: {
    username?: string;
    email?: string;
    password?: string;
    password_verify?: string;
    show_nsfw: boolean;
    captcha_uuid?: string;
    captcha_answer?: string;
    honeypot?: string;
    answer?: string;
  };
  captchaPlaying: boolean;
  piBrowser: boolean;
  token?: GetCaptchaResponse;
  siteRes: GetSiteResponse;
}

export class Signup extends Component<any, State> {
  private isoData = setIsoData(this.context);
  private audio?: HTMLAudioElement;
  state: State = {
    registerRes: { state: "empty" },
    captchaRes: { state: "empty" },
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
    captchaPlaying: false,
    piBrowser: false,
    siteRes: this.isoData.site_res,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handleAnswerChange = this.handleAnswerChange.bind(this);
  }

  async componentDidMount() {
    if (this.state.siteRes.site_view.local_site.captcha_enabled) {
      await this.fetchCaptcha();
    }
  }

  async fetchCaptcha() {
    this.setState({ captchaRes: { state: "loading" } });
    this.setState({
      captchaRes: await HttpService.client.getCaptcha({}),
    });

    this.setState(s => {
      if (s.captchaRes.state == "success") {
        s.form.captcha_uuid = s.captchaRes.data.ok?.uuid;
      }
      return s;
    });
  }

  get documentTitle(): string {
    const siteView = this.state.siteRes.site_view;
    return `${this.titleName(siteView)} - ${siteView.site.name}`;
  }

  titleName(siteView: SiteView): string {
    return I18NextService.i18n.t(
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
      <div className="home-signup container-lg">
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
    const siteView = this.state.siteRes.site_view;
    return (
      <form
        className="was-validated"
        onSubmit={linkEvent(this, this.handleRegisterSubmit)}
      >
        <h1 className="h4 mb-4">{this.titleName(siteView)}</h1>

        {this.isLemmyMl && (
          <div className="mb-3 row">
            <div className="mt-2 mb-0 alert alert-warning" role="alert">
              <T i18nKey="lemmy_ml_registration_message">
                #<a href={joinLemmyUrl}>#</a>
              </T>
            </div>
          </div>
        )}

        <div className="mb-3 row">
          <label
            className="col-sm-2 col-form-label"
            htmlFor="register-username"
          >
            {I18NextService.i18n.t("username")}
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
              placeholder={I18NextService.i18n.t(
                "Choose an username for desktop login"
              )}
              pattern="[a-zA-Z0-9_]+"
              title={I18NextService.i18n.t("community_reqs")}
            />
          </div>
        </div>

        <div className="mb-3 row">
          <label className="col-sm-2 col-form-label" htmlFor="register-email">
            {I18NextService.i18n.t("email")}
          </label>
          <div className="col-sm-10">
            <input
              type="email"
              id="register-email"
              className="form-control"
              placeholder={
                siteView.local_site.require_email_verification
                  ? I18NextService.i18n.t("required")
                  : I18NextService.i18n.t("optional")
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
                  <Icon icon="alert-triangle" classes="icon-inline me-2" />
                  {I18NextService.i18n.t("no_password_reset")}
                </div>
              )}
          </div>
        </div>

        <div className="mb-3">
          <PasswordInput
            id="register-password"
            value={this.state.form.password}
            onInput={linkEvent(this, this.handleRegisterPasswordChange)}
            showStrength
            label={I18NextService.i18n.t("password")}
          />
        </div>

        <div className="mb-3">
          <PasswordInput
            id="register-verify-password"
            value={this.state.form.password_verify}
            onInput={linkEvent(this, this.handleRegisterPasswordVerifyChange)}
            label={I18NextService.i18n.t("verify_password")}
          />
        </div>

        {siteView.local_site.registration_mode === "RequireApplication" && (
          <>
            <div className="mb-3 row">
              <div className="offset-sm-2 col-sm-10">
                <div className="mt-2 alert alert-warning" role="alert">
                  <Icon icon="alert-triangle" classes="icon-inline me-2" />
                  {I18NextService.i18n.t("fill_out_application")}
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

            <div className="mb-3 row">
              <label
                className="col-sm-2 col-form-label"
                htmlFor="application_answer"
              >
                {I18NextService.i18n.t("answer")}
              </label>
              <div className="col-sm-10">
                <MarkdownTextArea
                  initialContent=""
                  onContentChange={this.handleAnswerChange}
                  hideNavigationWarnings
                  allLanguages={[]}
                  siteLanguages={[]}
                />
              </div>
            </div>
          </>
        )}
        {this.renderCaptcha()}
        <div className="mb-3 row">
          <div className="col-sm-10">
            <div className="form-check">
              <input
                className="form-check-input"
                id="register-show-nsfw"
                type="checkbox"
                checked={this.state.form.show_nsfw}
                onChange={linkEvent(this, this.handleRegisterShowNsfwChange)}
              />
              <label className="form-check-label" htmlFor="register-show-nsfw">
                {I18NextService.i18n.t("show_nsfw")}
              </label>
            </div>
          </div>
        </div>
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
        <div className="mb-3 row">
          <div className="col-sm-10">
            <button type="submit" className="btn btn-secondary">
              {this.state.registerRes.state == "loading" ? (
                <Spinner />
              ) : (
                this.titleName(siteView)
              )}
            </button>
          </div>
        </div>
      </form>
    );
  }

  renderCaptcha() {
    switch (this.state.captchaRes.state) {
      case "loading":
        return <Spinner />;
      case "success": {
        const res = this.state.captchaRes.data;
        return (
          <div className="mb-3 row">
            <label className="col-sm-2" htmlFor="register-captcha">
              <span className="me-2">
                {I18NextService.i18n.t("enter_code")}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={linkEvent(this, this.handleRegenCaptcha)}
                aria-label={I18NextService.i18n.t("captcha")}
              >
                <Icon icon="refresh-cw" classes="icon-refresh-cw" />
              </button>
            </label>
            {this.showCaptcha(res)}
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
        );
      }
    }
  }

  showCaptcha(res: GetCaptchaResponse) {
    const captchaRes = res?.ok;
    return captchaRes ? (
      <div className="col-sm-4">
        <>
          <img
            className="rounded-top img-fluid"
            src={this.captchaPngSrc(captchaRes)}
            style="border-bottom-right-radius: 0; border-bottom-left-radius: 0;"
            alt={I18NextService.i18n.t("captcha")}
          />
          {captchaRes.wav && (
            <button
              className="rounded-bottom btn btn-sm btn-secondary d-block"
              style="border-top-right-radius: 0; border-top-left-radius: 0;"
              title={I18NextService.i18n.t("play_captcha_audio")}
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

  async handleRegisterSubmit(i: Signup, event: any) {
    event.preventDefault();
    const {
      show_nsfw,
      answer,
      captcha_answer,
      captcha_uuid,
      email,
      honeypot,
      password,
      password_verify,
      username,
    } = i.state.form;
    if (username && password && password_verify) {
      i.setState({ registerRes: { state: "loading" } });

      const registerRes = await HttpService.client.register({
        username,
        password,
        password_verify,
        email,
        show_nsfw,
        captcha_uuid,
        captcha_answer,
        honeypot,
        answer,
      });
      switch (registerRes.state) {
        case "failed": {
          toast(registerRes.msg, "danger");
          i.setState({ registerRes: { state: "empty" } });
          break;
        }

        case "success": {
          const data = registerRes.data;

          // Only log them in if a jwt was set
          if (data.jwt) {
            UserService.Instance.login({
              res: data,
            });

            const site = await HttpService.client.getSite({ auth: myAuth() });

            if (site.state === "success") {
              UserService.Instance.myUserInfo = site.data.my_user;
            }

            i.props.history.replace("/communities");
          } else {
            if (data.verify_email_sent) {
              toast(I18NextService.i18n.t("verify_email_sent"));
            }
            if (data.registration_created) {
              toast(I18NextService.i18n.t("registration_application_sent"));
            }
            i.props.history.push("/");
          }
          break;
        }
      }
    }
  }

  handleRegisterUsernameChange(i: Signup, event: any) {
    event.target.value = event.target.value.toLowerCase();
    i.state.form.username = event.target.value.trim();
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

  async handleRegenCaptcha(i: Signup) {
    i.audio = undefined;
    i.setState({ captchaPlaying: false });
    await i.fetchCaptcha();
  }

  handleCaptchaPlay(i: Signup) {
    // This was a bad bug, it should only build the new audio on a new file.
    // Replays would stop prematurely if this was rebuilt every time.

    if (i.state.captchaRes.state == "success" && i.state.captchaRes.data.ok) {
      const captchaRes = i.state.captchaRes.data.ok;
      if (!i.audio) {
        const base64 = `data:audio/wav;base64,${captchaRes.wav}`;
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

  // parseMessage(msg: any) {
  //   let op = wsUserOp(msg);
  //   if (msg.error) {
  //     toast(i18n.t(msg.error), "danger");
  //     this.setState(s => ((s.form.captcha_answer = undefined), s));
  //     this.setState({ registerLoading: false });
  //     // Refetch another captcha
  //     // WebSocketService.Instance.send(wsClient.getCaptcha());
  //     return;
  //   } else {
  //     if (op == UserOperation.Register) {
  //       let data = wsJsonToRes<LoginResponse>(msg);
  //       // Only log them in if a jwt was set
  //       if (data.jwt) {
  //         UserService.Instance.login(data);
  //         this.props.history.push("/communities");
  //         location.reload();
  //       } else {
  //         if (data.verify_email_sent) {
  //           toast(i18n.t("verify_email_sent"));
  //         }
  //         if (data.registration_created) {
  //           toast(i18n.t("registration_application_sent"));
  //         }
  //         this.props.history.push("/");
  //       }
  //     } else if (op == UserOperation.GetCaptcha) {
  //       let data = wsJsonToRes<GetCaptchaResponse>(msg);
  //       if (data.ok) {
  //         this.setState({ captcha: data });
  //         this.setState(s => ((s.form.captcha_uuid = data.ok?.uuid), s));
  //       }
  //     } else if (op == UserOperation.PasswordReset) {
  //       toast(i18n.t("reset_password_mail_sent"));
  //     } else if (op == UserOperation.GetSite) {
  //       let data = wsJsonToRes<GetSiteResponse>(msg);
  //       this.setState({ siteRes: data });
  //     } else if (op == UserOperation.GetToken) {
  //       let data = wsJsonToRes<GetCaptchaResponse>(msg);
  //       if (data.ok) {
  //         this.setState({ token: data });
  //         let uuid = data.ok?.uuid;
  //         this.setState(s => ((s.web3RegisterForm.ea.token = uuid), s));
  //       }
  //     } else if (op == UserOperation.Web3Register) {
  //       this.setState({ registerLoading: false });
  //       let data = wsJsonToRes<LoginResponse>(msg);
  //       //this.setState(this.emptyState);
  //       // Only log them in if a jwt was set
  //       if (data.jwt) {
  //         UserService.Instance.login(data);
  //         this.props.history.push("/communities");
  //         location.reload();
  //       } else {
  //         if (data.verify_email_sent) {
  //           toast(i18n.t("verify_email_sent"));
  //         }
  //         if (data.registration_created) {
  //           toast(i18n.t("registration_application_sent"));
  //         }
  //         this.props.history.push("/");
  //       }
  //     } else if (op == UserOperation.PiRegister) {
  //       this.setState({ registerLoading: false });
  //       let data = wsJsonToRes<LoginResponse>(msg);
  //       //this.setState(this.emptyState);
  //       // Only log them in if a jwt was set
  //       if (data.jwt) {
  //         UserService.Instance.login(data);
  //         this.props.history.push("/communities");
  //         location.reload();
  //       } else {
  //         if (data.verify_email_sent) {
  //           toast(i18n.t("verify_email_sent"));
  //         }
  //         if (data.registration_created) {
  //           toast(i18n.t("registration_application_sent"));
  //         }
  //         this.props.history.push("/");
  //       }
  //     } else if (op == UserOperation.PiRegisterWithFee) {
  //       let data = wsJsonToRes<LoginResponse>(msg);
  //       //this.setState(this.emptyState);
  //       // Only log them in if a jwt was set
  //       if (data.jwt) {
  //         UserService.Instance.login(data);
  //         this.props.history.push("/communities");
  //         location.reload();
  //       } else {
  //         if (data.verify_email_sent) {
  //           toast(i18n.t("verify_email_sent"));
  //         }
  //         if (data.registration_created) {
  //           toast(i18n.t("registration_application_sent"));
  //         }
  //         this.props.history.push("/");
  //       }
  //     }
  //   }
  // }

  async handleWeb3RegisterLoginFree(i: Signup, event: any) {
    const { ethereum } = window;
    var accounts = await ethereum.request({
      method: "eth_requestAccounts",
    });
    if (i.state.form.captcha_uuid) {
      //i.state.web3LoginForm.token = res;
    }
    i.state.web3LoginForm.account = ethereum.selectedAddress;
    const login: LoginForm = {
      username_or_email: i.state.form.username,
      password: i.state.form.password,
    };
    i.state.web3LoginForm.info = login;

    i.state.web3LoginForm.epoch = new Date().getTime();
    const text =
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
        // WebSocketService.Instance.send(
        //   wsClient.web3Login(i.state.web3LoginForm)
        // );
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
    const text =
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
        // WebSocketService.Instance.send(
        //   wsClient.web3Register(i.state.web3RegisterForm)
        // );
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
      //WebSocketService.Instance.send(wsClient.piPaymentFound(found));
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
    //WebSocketService.Instance.send(wsClient.piRegister(piRegisterForm));
  }

  async handlePiRegisterWithFee(i: Signup, event: any) {
    if (!i.isPiBrowser) return;
    if (i.isPiBrowser) return;
    if (event) event.preventDefault();
    //i.setState({ registerLoading: true });
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
      agree.paymentid = payment_id.toString();
      //WebSocketService.Instance.send(wsClient.piAgree(agree));
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

      //WebSocketService.Instance.send(wsClient.piRegisterWithFee(reg));
      return true;
    };

    const onCancel = paymentId => {
      i.setState({ registerLoading: false });
      i.setState(i.state);
    };

    const onError = (error, paymentId) => {
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
    }
  }
}
