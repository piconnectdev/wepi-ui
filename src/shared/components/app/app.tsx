import { Component } from "inferno";
import { Helmet } from "inferno-helmet";
import { Provider } from "inferno-i18next-dess";
import { Route, Switch } from "inferno-router";
import { i18n } from "../../i18next";
import { routes } from "../../routes";
import {
  favIconPngUrl,
  favIconUrl,
  fetchSite,
  isBrowser,
  setIsoData,
} from "../../utils";
import { Footer } from "./footer";
import { Navbar } from "./navbar";
import { NoMatch } from "./no-match";
import "./styles.scss";
import { Theme } from "./theme";

export class App extends Component<any, any> {
  private isoData = setIsoData(this.context);
  constructor(props: any, context: any) {
    if (isBrowser()) {
      fetchSite().then(site => {
        console.log("initializeSite from client app");
        window.isoData.site_res = site;
        this.isoData.site_res = site;
        console.log(
          "App init as: my_user:" +
            JSON.stringify(this.isoData.site_res.my_user)
        );
        //UserService.Instance.myUserInfo = site.my_user;
        //i18n.changeLanguage(getLanguages()[0]);
        //location.reload();
      });
      super(props, context);
    } else {
      super(props, context);
    }
    //this.isoData = setIsoData(this.context);
    console.log("App init: path:" + JSON.stringify(this.isoData.path));
    //console.log("App init:" + JSON.stringify(this.isoData.site_res.site_view));
    console.log(
      "App init: my_user:" + JSON.stringify(this.isoData.site_res.my_user)
    );
  }
  render() {
    let siteRes = this.isoData.site_res;
    let siteView = siteRes.site_view;
    let icon = siteView.site.icon;

    return (
      <>
        <Provider i18next={i18n}>
          <div id="app">
            <Theme defaultTheme={siteView.local_site.default_theme} />
            {icon && (
              <Helmet>
                <link
                  id="favicon"
                  rel="shortcut icon"
                  type="image/x-icon"
                  href={icon || favIconUrl}
                />
                <link rel="apple-touch-icon" href={icon || favIconPngUrl} />
              </Helmet>
            )}
            <Navbar siteRes={siteRes} />
            <div className="mt-4 p-0 fl-1">
              <Switch>
                {routes.map(
                  ({ path, exact, component: Component, ...rest }) => (
                    <Route
                      key={path}
                      path={path}
                      exact={exact}
                      render={props => <Component {...props} {...rest} />}
                    />
                  )
                )}
                <Route render={props => <NoMatch {...props} />} />
              </Switch>
            </div>
            <Footer site={siteRes} />
          </div>
        </Provider>
      </>
    );
  }
}
