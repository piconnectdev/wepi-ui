import { Component, Fragment } from "inferno";
import { GetPayments, UserOperation, wsUserOp } from "lemmy-js-client";
import moment from "moment";
import { UserService, WebSocketService } from "../../services";
import { myAuth, wsClient, wsSubscribe } from "../../utils";
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
  loading: boolean;
  page: number;
  sizePage: number;
}

export class Payments extends Component<any, PaymentsState> {
  // state: PaymentsState = {
  //   loading: true,
  //   page: getPageFromProps(this.props),
  //   listingType: getListingTypeFromPropsNoDefault(this.props),
  //   siteRes: this.isoData.site_res,
  //   searchText: "",
  // };
  MAX_SIZE_TABLE = 10;
  constructor(props: any, context: any) {
    super(props, context);

    this.parseMessage = this.parseMessage.bind(this);
    wsSubscribe(this.parseMessage);

    this.state = {
      loading: false,
      piPayments: [],
      page: 1,
      sizePage: 1,
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
      this.setState({
        loading: true,
      });
      WebSocketService.Instance.send(wsClient.piGetPayments(form));
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
                  {this.state?.piPayments
                    .slice(
                      (this.state.page - 1) * this.MAX_SIZE_TABLE,
                      (this.state.page + 1) * this.MAX_SIZE_TABLE
                    )
                    .map(cv => (
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
                            {moment(cv.created_at).format(
                              "YYYY-MM-DD HH:mm:ss"
                            )}
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
                          {cv.direction ? (
                            <IconArrowRight />
                          ) : (
                            <IconArrowLeft />
                          )}
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
            <Paginator
              page={this.state.page}
              onChange={this.handlePageChange}
            />
          </Fragment>
        )}
      </div>
    );
  }

  handlePageChange = (page: number) => {
    this.setState({ page });
  };

  parseMessage(msg: any) {
    let op = wsUserOp(msg);

    switch (op) {
      case UserOperation.GetPayments: {
        const piPayments = msg.data.pipayments;
        this.setState({
          piPayments,
          loading: false,
          page: 1,
          sizePage: Math.ceil(piPayments.length / this.MAX_SIZE_TABLE),
        });
        break;
      }
      default:
        break;
    }
  }
}
