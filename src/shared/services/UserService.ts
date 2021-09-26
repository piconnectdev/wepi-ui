// import Cookies from 'js-cookie';
import IsomorphicCookie from "isomorphic-cookie";
import jwt_decode from "jwt-decode";
import { LoginResponse, MyUserInfo } from "lemmy-js-client";
import { BehaviorSubject, Subject } from "rxjs";
import { isHttps } from "../env";
import Cookies from 'js-cookie'
interface Claims {
  sub: string;
  iss: string;
  iat: number;
}

export class UserService {
  private static _instance: UserService;
  public myUserInfo: MyUserInfo;
  public claims: Claims;
  public jwtSub: Subject<string> = new Subject<string>();
  public jwtString: string;
  public unreadCountSub: BehaviorSubject<number> = new BehaviorSubject<number>(
    0
  );

  private constructor() {
    if (this.auth) {
      this.setClaims(this.auth);
      this.jwtString = this.auth;
    } else {
      // setTheme();
      this.jwtString = undefined
      console.log("No JWT cookie found.");
    }
  }

  public login(res: LoginResponse) {
    let expires = new Date();
    expires.setDate(expires.getDate() + 30);
    IsomorphicCookie.save("jwt", res.jwt, { expires, secure: isHttps });
    Cookies.set("wepiJwt", res.jwt, { expires: 7 });
    this.jwtString = res.jwt;
    console.log("jwt cookie set");
    this.setClaims(res.jwt);
  }

  public logout() {
    this.claims = undefined;
    this.myUserInfo = undefined;
    // setTheme();
    this.jwtSub.next("");
    this.jwtString = undefined;
    IsomorphicCookie.remove("jwt"); // TODO is sometimes unreliable for some reason
    Cookies.remove('wepiJwt', { path: '/', domain: 'wepi.social' })
    document.cookie = "jwt=; Max-Age=0; path=/; wepiJwt=;domain=" + location.host;
    console.log("Logged out.");
  }

  public get auth(): string {
    return IsomorphicCookie.load("jwt");
  }

  public get jwt(): string {
    return Cookies.get('wepiJwt');
    //return this.jwtString;
  }

  private setClaims(jwt: string) {
    this.claims = jwt_decode(jwt);
    this.jwtSub.next(jwt);
  }

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }
}
