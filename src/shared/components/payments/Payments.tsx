import { Component, Fragment } from "inferno";
import {
  GetPayments,
  PiPaymentSafe,
  UserOperation,
  wsUserOp,
} from "lemmy-js-client";
import moment from "moment";
import { UserService, WebSocketService } from "../../services";
import { getPageFromProps, myAuth, wsClient, wsSubscribe } from "../../utils";
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
  piPayments: Array<PiPaymentSafe>;
  loading: boolean;
  page: number;
  sizePage: number;
}

export class Payments extends Component<any, PaymentsState> {
  MAX_SIZE_TABLE = 10;
  state: PaymentsState = {
    loading: false,
    piPayments: [],
    page: getPageFromProps(this.props),
    sizePage: 1,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.parseMessage = this.parseMessage.bind(this);
    wsSubscribe(this.parseMessage);
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
                <h4>Payments</h4>
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
                      Time
                    </th>
                    <th
                      className="text-center"
                      style={{
                        width: "10%",
                      }}
                    >
                      Completed
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
                      className="text-left"
                      style={{
                        width: "25%",
                      }}
                    >
                      From
                    </th>
                    <th
                      className="text-left"
                      style={{
                        width: "25%",
                      }}
                    >
                      To
                    </th>
                    <th
                      className={"text-right"}
                      style={{
                        width: "10%",
                      }}
                    >
                      TXID
                    </th>
                    <th
                      className={"text-right"}
                      style={{
                        width: "10%",
                      }}
                    >
                      ID
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {this.state.piPayments.length > 0 &&
                    Array.isArray(this.state.piPayments) &&
                    this.state.piPayments
                      .slice(
                        (this.state.page - 1) * this.MAX_SIZE_TABLE,
                        (this.state.page + 1) * this.MAX_SIZE_TABLE
                      )
                      .map(cv => (
                        <tr key={cv.identifier}>
                          <td className={"text-left"}>
                            <div
                              style={{
                                width: "150px",
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
                              {moment(new Date(`${cv.created_at}Z`)).format(
                                "YYYY-MM-DD HH:mm:ss"
                              )}
                            </div>
                          </td>
                          <td className="text-center">
                            {cv.completed ? <IconCheck /> : <IconXMark />}
                          </td>
                          <td className="text-center">
                            {cv.a2u == 0 ? (
                              <IconArrowRight />
                            ) : (
                              <IconArrowLeft />
                            )}
                          </td>
                          <td className="text-left">
                            <div
                              style={{
                                width: "200px",
                                overflow: "hidden",
                                "text-overflow": "ellipsis",
                              }}
                            >
                              {cv.memo}
                            </div>
                          </td>
                          <td className="text-left">
                            <div
                              style={{
                                width: "200px",
                                overflow: "hidden",
                                "text-overflow": "ellipsis",
                              }}
                              title={cv.from_address}
                            >
                              {cv.from_address}
                            </div>
                          </td>
                          <td className="text-left">
                            <div
                              style={{
                                width: "200px",
                                overflow: "hidden",
                                "text-overflow": "ellipsis",
                              }}
                              title={cv.to_address}
                            >
                              {cv.to_address}
                            </div>
                          </td>
                          <td className="text-left">
                            <div
                              style={{
                                width: "100px",
                                overflow: "hidden",
                                "text-overflow": "ellipsis",
                              }}
                              title={cv.id}
                            >
                              <a
                                href={`${cv.tx_link}`}
                                target={"_blank"}
                                rel="noreferrer"
                              >
                                {cv.tx_id}
                              </a>
                            </div>
                          </td>
                          <td className="text-left">
                            <div
                              style={{
                                width: "200px",
                                overflow: "hidden",
                                "text-overflow": "ellipsis",
                              }}
                              title={cv.id}
                            >
                              {cv.id}
                            </div>
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
    this.props.history.push(`/payments/page/${page}`);
  };

  parseMessage(msg: any) {
    let op = wsUserOp(msg);

    switch (op) {
      case UserOperation.GetPayments: {
        const piPayments = msg.data.pipayments;
        this.setState({
          piPayments,
          loading: false,
        });
        break;
      }
      default:
        break;
    }
  }
}
