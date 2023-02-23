import { Component } from "inferno";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconXMark,
} from "../common/icon";
import { Paginator } from "../common/paginator";

interface PaymentsState {
  // listCommunitiesResponse?: ListCommunitiesResponse;
  // page: number;
  // loading: boolean;
  // siteRes: GetSiteResponse;
  // searchText: string;
  // listingType: ListingType;
  payments: Array<any>;
}

//
// interface PaymentsProps {
//   // listingType?: ListingType;
//   // page?: number;
// }

export class Payments extends Component<any, PaymentsState> {
  // private subscription?: Subscription;
  // private isoData = setIsoData(this.context);
  // state: PaymentsState = {
  //   loading: true,
  //   page: getPageFromProps(this.props),
  //   listingType: getListingTypeFromPropsNoDefault(this.props),
  //   siteRes: this.isoData.site_res,
  //   searchText: "",
  // };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = {
      payments: [
        {
          identifier: "Identifier",
          created_at: "Created at",
          verified: "Verified",
          address: "Address",
          direction: "Direction",
          memo: "98d6ca2c67342bc918bc97574f02eb5e869a975f343f5b955a70c28d1d93e63c",
          txid: "Txid",
        },
        {
          identifier: "Identifier",
          created_at: "Created at",
          verified: "Verified",
          address: "Address",
          direction: "Direction",
          memo: "98d6ca2c67342bc918bc97574f02eb5e869a975f343f5b955a70c28d1d93e63c",
          txid: "Txid",
        },
      ],
    };
    // this.handlePageChange = this.handlePageChange.bind(this);
    // this.handleListingTypeChange = this.handleListingTypeChange.bind(this);
    //
    // this.parseMessage = this.parseMessage.bind(this);
    // this.subscription = wsSubscribe(this.parseMessage);
    //
    // // Only fetch the data if coming from another route
    // if (this.isoData.path == this.context.router.route.match.url) {
    //     let listRes = this.isoData.routeData[0] as ListCommunitiesResponse;
    //     this.state = {
    //         ...this.state,
    //         listCommunitiesResponse: listRes,
    //         loading: false,
    //     };
    // } else {
    //     this.refetch();
    // }
  }

  componentWillUnmount() {
    // if (isBrowser()) {
    //     this.subscription?.unsubscribe();
    // }
  }

  // get documentTitle(): string {
  //     return `${i18n.t("payments")} - ${
  //         this.state.siteRes.site_view.site.name
  //     }`;
  // }

  render() {
    return (
      <div className={"container-lg"}>
        <div className="row">
          <div className="col-md-6">
            <h4>List Of Payments</h4>
          </div>
        </div>

        <div className="table-responsive">
          <table id="community_table" className="table table-sm table-hover">
            <thead className="pointer">
              <tr>
                <th className={"text-left"}>Identifier</th>
                <th className="text-left">Created At</th>
                <th className="text-center">Verified</th>
                <th className="text-left">Address</th>
                <th className="text-center">Direction</th>
                <th className={"text-left"}>Memo</th>
                <th className={"text-left"}>TXID</th>
              </tr>
            </thead>
            <tbody>
              {this.state?.payments.map(cv => (
                <tr key={cv.identifier}>
                  <td className={"text-left"}>
                    {/*<CommunityLink community={cv.community} />*/}
                    {cv.identifier}
                  </td>
                  <td className="text-left">
                    {/*{numToSI(cv.counts.subscribers)}*/}
                    {cv.created_at}
                  </td>
                  <td className="text-center">
                    {/*{numToSI(cv.counts.users_active_month)}*/}
                    {cv.verified ? <IconCheck /> : <IconXMark />}
                  </td>
                  <td className="text-left d-none d-lg-table-cell">
                    {/*{numToSI(cv.counts.posts)}*/}
                    {cv.address}
                  </td>
                  <td className="text-center d-none d-lg-table-cell">
                    {/*{numToSI(cv.counts.comments)}*/}
                    {cv.direction ? <IconArrowRight /> : <IconArrowLeft />}
                  </td>
                  <td className="text-left">
                    <a
                      href={`https://www.pi-blockexplorer.com/explorer/transaction/${cv.memo}`}
                      target={"_blank"} rel="noreferrer"
                    >
                      {cv.memo}
                    </a>
                  </td>
                  <td className="text-left">{cv.txid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Paginator page={1} onChange={this.handlePageChange} />
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
}
