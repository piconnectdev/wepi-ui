import { Component, Fragment } from "inferno";
import {
  CommunityResponse,
  GetPayments,
  LemmyHttp,
  ListCommunitiesResponse,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import moment from "moment";
import { i18n } from "../../i18next";
import { UserService } from "../../services";
import { myAuth, setIsoData, toast, wsClient } from "../../utils";
import { HtmlTags } from "../common/html-tags";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconXMark,
  Spinner,
} from "../common/icon";
import { Paginator } from "../common/paginator";

interface PaymentsState {
  // listCommunitiesResponse?: ListCommunitiesResponse;
  // page: number;
  // loading: boolean;
  // siteRes: GetSiteResponse;
  // searchText: string;
  // listingType: ListingType;
  piPayments: Array<{
    id: string;
    person_id: string;
    obj_cat: string;
    obj_id: string;
    a2u: number;
    step: number;
    asset: "PI";
    fee: number;
    testnet: boolean;
    finished: boolean;
    published: string;
    updated: any;
    ref_id: string;
    comment: string;
    stat: any;
    identifier: string;
    user_uid: string;
    amount: number;
    memo: string;
    from_address: string;
    to_address: string;
    direction: string;
    created_at: string;
    approved: boolean;
    verified: boolean;
    completed: boolean;
    cancelled: boolean;
    user_cancelled: boolean;
    tx_verified: boolean;
    tx_link: any;
    tx_id: any;
    network: string;
    metadata: any;
    extras: any;
  }>;
}

//
// interface PaymentsProps {
//   // listingType?: ListingType;
//   // page?: number;
// }

export class Payments extends Component<any, PaymentsState> {
  // private subscription?: Subscription;
  private isoData = setIsoData(this.context);
  // state: PaymentsState = {
  //   loading: true,
  //   page: getPageFromProps(this.props),
  //   listingType: getListingTypeFromPropsNoDefault(this.props),
  //   siteRes: this.isoData.site_res,
  //   searchText: "",
  // };

  constructor(props: any, context: any) {
    super(props, context);
    console.log("isoData", { isoData: this.isoData, context: this.context });
    this.state = {
      piPayments: [
        {
          id: "01868400-2859-2aa1-087c-2b0a6c0e1780",
          person_id: "01868119-5604-30b1-0328-5a23d7664740",
          obj_cat: "tip:page",
          obj_id: "01867c67-b11d-09e1-03d6-a53ff2876bc0",
          a2u: 0,
          step: 0,
          asset: "PI",
          fee: 0,
          testnet: true,
          finished: false,
          published: "2023-02-24T15:17:28.281682",
          updated: null,
          ref_id: "01867c66-878d-0881-0da6-226a3b011700",
          comment: "tip aza for page",
          stat: null,
          identifier: "3LADJ7KgGlPJv2tTc7AKHZCg5Qys",
          user_uid: "2fb48255-c835-452b-8846-3f72e03daa09",
          amount: 0.1,
          memo: "Tip aza 0.1 π for page: Test",
          from_address: "",
          to_address:
            "GBEEHOX4YB6LMJPAYVHCNCQPCARPJLCDJNOSKSBJDGBRPOCNICBS6RPE",
          direction: "user_to_app",
          created_at: "2023-02-24T15:17:26.156",
          approved: true,
          verified: false,
          completed: false,
          cancelled: false,
          user_cancelled: false,
          tx_verified: false,
          tx_link: null,
          tx_id: null,
          network: "Pi Testnet",
          metadata: null,
          extras: null,
        },
        {
          id: "018683ff-855a-15d1-0247-62c11e0b0280",
          person_id: "01868119-5604-30b1-0328-5a23d7664740",
          obj_cat: "tip:page",
          obj_id: "01867c87-ec4a-0ca1-07f5-6df4e5c496c0",
          a2u: 0,
          step: 0,
          asset: "PI",
          fee: 0,
          testnet: true,
          finished: false,
          published: "2023-02-24T15:16:46.554349",
          updated: null,
          ref_id: "01867c66-878d-0881-0da6-226a3b011700",
          comment: "tip aza for page",
          stat: null,
          identifier: "2KoA7RDXyTvv5oeGnJHKOU6OoMBJ",
          user_uid: "2fb48255-c835-452b-8846-3f72e03daa09",
          amount: 0.1,
          memo: "Tip aza 0.1 π for page: Hello",
          from_address: "",
          to_address:
            "GBEEHOX4YB6LMJPAYVHCNCQPCARPJLCDJNOSKSBJDGBRPOCNICBS6RPE",
          direction: "user_to_app",
          created_at: "2023-02-24T15:16:43.432",
          approved: true,
          verified: false,
          completed: false,
          cancelled: false,
          user_cancelled: false,
          tx_verified: false,
          tx_link: null,
          tx_id: null,
          network: "Pi Testnet",
          metadata: null,
          extras: null,
        },
        {
          id: "01868120-ef4c-1cf1-09c6-cd517f1d4f80",
          person_id: "01868119-5604-30b1-0328-5a23d7664740",
          obj_cat: "tip:page",
          obj_id: "01867ce1-a3cb-2931-087f-719146cdfc00",
          a2u: 0,
          step: 0,
          asset: "PI",
          fee: 0,
          testnet: true,
          finished: false,
          published: "2023-02-24T01:54:24.716463",
          updated: null,
          ref_id: "01867c66-878d-0881-0da6-226a3b011700",
          comment: "tip for page of aza",
          stat: null,
          identifier: "VlbAJOgdishfPwvebOfr9zpOweKk",
          user_uid: "2fb48255-c835-452b-8846-3f72e03daa09",
          amount: 0.1,
          memo: "Tip aza 0.1 π for Tttttttt",
          from_address: "",
          to_address:
            "GBEEHOX4YB6LMJPAYVHCNCQPCARPJLCDJNOSKSBJDGBRPOCNICBS6RPE",
          direction: "user_to_app",
          created_at: "2023-02-24T01:54:21.570",
          approved: true,
          verified: false,
          completed: false,
          cancelled: false,
          user_cancelled: false,
          tx_verified: false,
          tx_link: null,
          tx_id: null,
          network: "Pi Testnet",
          metadata: null,
          extras: null,
        },
      ],
    };
  }

  componentWillUnmount() {
    // if (isBrowser()) {
    //     this.subscription?.unsubscribe();
    // }
  }

  handleGetPaymentSubmit() {
    let getUser = UserService.Instance.myUserInfo;
    let auth = myAuth(true);
    if (getUser && auth) {
      let form: GetPayments = {
        person_id: getUser.local_user_view.person.id,
        //person_name?: string;
        //step?: number;
        //a2u: 0,
        //pending?: boolean;
        //page?: number;
        limit: 100,
        //domain: window.location.hostname,
        //asset: "PI",
        auth: auth,
      };
      //console.log("Send GetPayments");
      const _abc = wsClient.piGetPayments(form);
      // const a = WebSocketService.Instance.send(wsClient.piGetPayments(form));
      console.log({ _abc });
      // this.setState({ piPayments: _abc });
    }
  }

  componentDidMount() {
    this.handleGetPaymentSubmit();
  }

  get documentTitle(): string {
    return "Payments";
  }

  render() {
    return (
      <div className={"container-lg"}>
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        {this.state?.loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          <Fragment>
            <div className="row">
              <div className="col-md-6">
                <h4>List Of Payments</h4>
              </div>
            </div>
            <div className="table-responsive">
              <table id="payments_table" className="table table-sm table-hover">
                <thead className="pointer">
                  <tr>
                    <th className={"text-left"}>Identifier</th>
                    <th
                      className="text-left"
                      style={{
                        width: "10%",
                      }}
                    >
                      Created At
                    </th>
                    <th
                      className="text-center"
                      style={{
                        width: "10%",
                      }}
                    >
                      Verified
                    </th>
                    <th
                      className="text-left"
                      style={{
                        width: "10%",
                      }}
                    >
                      Address
                    </th>
                    <th
                      className="text-center"
                      style={{
                        width: "10%",
                      }}
                    >
                      Direction
                    </th>
                    <th
                      className={"text-left"}
                      style={{
                        width: "10%",
                      }}
                    >
                      Memo
                    </th>
                    <th
                      className={"text-right"}
                      style={{
                        width: "40%",
                      }}
                    >
                      TXID
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {this.state?.piPayments.map(cv => (
                    <tr key={cv.identifier}>
                      <td className={"text-left"}>
                        <div
                          style={{
                            width: "100px",
                            overflow: "hidden",
                            "text-overflow": "ellipsis",
                          }}
                          title={cv.identifier}
                        >
                          {cv.identifier}
                        </div>
                      </td>
                      <td className="text-left">
                        <div
                          style={{
                            width: "180px",
                          }}
                        >
                          {moment(cv.created_at).format("YYYY-MM-DD HH:mm:ss")}
                        </div>
                      </td>
                      <td className="text-center">
                        {cv.verified ? <IconCheck /> : <IconXMark />}
                      </td>
                      <td className="text-left d-none d-lg-table-cell">
                        <div
                          style={{
                            width: "100px",
                            overflow: "hidden",
                            "text-overflow": "ellipsis",
                          }}
                          title={cv.to_address}
                        >
                          {cv.to_address}
                        </div>
                      </td>
                      <td className="text-center d-none d-lg-table-cell">
                        {cv.direction ? <IconArrowRight /> : <IconArrowLeft />}
                      </td>
                      <td className="text-left">
                        <div
                          style={{
                            width: "300px",
                          }}
                        >
                          {cv.memo}
                        </div>
                      </td>
                      <td className="text-left">
                        <a
                          href={`https://www.pi-blockexplorer.com/explorer/transaction/${cv.tx_id}`}
                          target={"_blank"}
                          rel="noreferrer"
                        >
                          {cv.tx_id}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginator page={1} onChange={this.handlePageChange} />
          </Fragment>
        )}
      </div>
    );
  }

  handlePageChange(page: number) {
    this.updateUrl({ page });
  }

  updateUrl(paramUpdates: any) {
    const page = paramUpdates.page; //paramUpdates.page || this.state.page;
    const listingTypeStr = "abc"; //paramUpdates.listingType || this.state.listingType;
    this.props.history.push(
      `/communities/listing_type/${listingTypeStr}/page/${page}`
    );
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      return;
    } else if (op == UserOperation.ListCommunities) {
      let data = wsJsonToRes<ListCommunitiesResponse>(msg);
      // this.setState({ listCommunitiesResponse: data, loading: false });
      window.scrollTo(0, 0);
    } else if (op == UserOperation.FollowCommunity) {
      let data = wsJsonToRes<CommunityResponse>(msg);
      // let res = this.state.listCommunitiesResponse;
      // let found = res?.communities.find(
      //     c => c.community.id == data.community_view.community.id
      // );
      // if (found) {
      //   found.subscribed = data.community_view.subscribed;
      //   found.counts.subscribers = data.community_view.counts.subscribers;
      //   this.setState(this.state);
      // }
    }
  }
}

export class WePiHttp extends LemmyHttp {
  constructor() {
    super();
    this.baseUrl = "https://wepi.social/api/v3";
  }
}
