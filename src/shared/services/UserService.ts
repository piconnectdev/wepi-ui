import IsomorphicCookie from "isomorphic-cookie";
//import Cookies from "js-cookie";
//import { Cookies } from "js-cookie";
import jwt_decode from "jwt-decode";
import { LoginResponse, MyUserInfo } from "lemmy-js-client";
import { LocalStorage } from "localstorage";
import { BehaviorSubject } from "rxjs";
import Cookies from "universal-cookie";
import { isHttps } from "../env";
import { i18n } from "../i18next";
import { isBrowser, toast } from "../utils";

interface Claims {
  sub: string;
  iss: string;
  iat: number;
}

interface JwtInfo {
  claims: Claims;
  jwt: string;
}

const cookies = new Cookies();

export class UserService {
  private static _instance: UserService;
  public myUserInfo?: MyUserInfo;
  public jwtInfo?: JwtInfo;
  public unreadInboxCountSub: BehaviorSubject<number> =
    new BehaviorSubject<number>(0);
  public unreadReportCountSub: BehaviorSubject<number> =
    new BehaviorSubject<number>(0);
  public unreadApplicationCountSub: BehaviorSubject<number> =
    new BehaviorSubject<number>(0);

  public jwtString?: string;
  //public storeJwt: LocalStorage;
  private constructor() {
    this.setJwtInfo();
    //this.storeJwt = LocalStorage("storeJwt");
  }

  public login(res: LoginResponse) {
    let expires = new Date();
    expires.setDate(expires.getDate() + 365);
    if (res.jwt) {
      toast(i18n.t("logged_in"));
      console.log("saveJwtInfo:" + res.jwt);
      IsomorphicCookie.save("jwt", res.jwt, { expires, secure: isHttps });
      this.jwtString = res.jwt;
      //LocalStorage.put("jwt", res.jwt);
      //document.cookie = "jwt=" + res.jwt + "; Max-Age=0; path=/; wepiJwt=; domain=" + location.hostname;
      cookies.set("wepiJwt", res.jwt, {
        expires,
        domain: location.host,
        secure: isHttps,
      });
      this.setJwtInfo();
    }
  }

  public logout() {
    this.jwtInfo = undefined;
    this.myUserInfo = undefined;
    IsomorphicCookie.remove("jwt"); // TODO is sometimes unreliable for some reason
    //saveJwt("");
    LocalStorage.delete("jwt");
    //Cookies.remove("wepiJwt");
    document.cookie =
      "jwt=; Max-Age=0; path=/; wepiJwt=; domain=" + location.hostname;
    location.reload();
  }

  public auth(throwErr = true): string | undefined {
    let jwt = this.jwtInfo?.jwt;
    if (jwt) {
      return jwt;
    } else {
      let msg = "No JWT cookie found";
      if (throwErr && isBrowser()) {
        console.error(msg);
        toast(i18n.t("not_logged_in"), "danger");
      }
      return undefined;
      // throw msg;
    }
  }

  private setJwtInfo() {
    let jwt: string | undefined = IsomorphicCookie.load("jwt");

    if (!jwt || jwt === undefined) {
      jwt = this.jwtString;
      console.log("setJwtInfo from string" + jwt);
    }
    if (!jwt || jwt === undefined) {
      jwt = cookies.get("wepiJwt");
      console.log("setJwtInfo from Cookies" + jwt);
    }
    // if (!jwt || jwt === undefined) {
    //   jwt = this.storeJwt.get("jwt");
    //   console.log("setJwtInfo from storeJwt" + jwt);
    // }

    if (jwt) {
      this.jwtInfo = { jwt, claims: jwt_decode(jwt) };
    }
    console.log("setJwtInfo:" + JSON.stringify(this.jwtInfo));
  }

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }
}
