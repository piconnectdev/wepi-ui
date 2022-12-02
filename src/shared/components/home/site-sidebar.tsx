import { None, Option } from "@sniptt/monads";
import { Component, linkEvent } from "inferno";
import { Link } from "inferno-router";
import { PersonViewSafe, Site, SiteAggregates } from "lemmy-js-client";
import { i18n } from "../../i18next";
import { mdToHtml, numToSI } from "../../utils";
import { BannerIconHeader } from "../common/banner-icon-header";
import { Icon } from "../common/icon";
import { PersonListing } from "../person/person-listing";

interface SiteSidebarProps {
  site: Site;
  showLocal: boolean;
  counts: Option<SiteAggregates>;
  admins: Option<PersonViewSafe[]>;
  online: Option<number>;
}

interface SiteSidebarState {
  collapsed: boolean;
}

export class SiteSidebar extends Component<SiteSidebarProps, SiteSidebarState> {
  private emptyState: SiteSidebarState = {
    collapsed: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.state = this.emptyState;
  }

  render() {
    return (
      <div className="card border-secondary mb-3">
        <div className="card-body">
          <div>
            <div className="mb-2">{this.siteName()}</div>
            {!this.state.collapsed && (
              <>
                <BannerIconHeader banner={this.props.site.banner} icon={None} />
                {this.siteInfo()}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  siteName() {
    return (
      <h5 className="mb-0 d-inline">
        {this.props.site.name}
        <button
          className="btn btn-sm text-muted"
          onClick={linkEvent(this, this.handleCollapseSidebar)}
          aria-label={i18n.t("collapse")}
          data-tippy-content={i18n.t("collapse")}
        >
          {this.state.collapsed ? (
            <Icon icon="plus-square" classes="icon-inline" />
          ) : (
            <Icon icon="minus-square" classes="icon-inline" />
          )}
        </button>
      </h5>
    );
  }

  siteInfo() {
    let site = this.props.site;
    return (
      <div>
        {site.description.match({
          some: description => <h6>{description}</h6>,
          none: <></>,
        })}
        {site.sidebar.match({
          some: sidebar => this.siteSidebar(sidebar),
          none: <></>,
        })}
        {this.props.counts.match({
          some: counts => this.badges(counts),
          none: <></>,
        })}
        {this.props.admins.match({
          some: admins => this.admins(admins),
          none: <></>,
        })}
      </div>
    );
  }

  siteSidebar(sidebar: string) {
    return (
      <div className="md-div" dangerouslySetInnerHTML={mdToHtml(sidebar)} />
    );
  }

  admins(admins: PersonViewSafe[]) {
    return (
      <ul className="mt-1 list-inline small mb-0">
        <li className="list-inline-item">{i18n.t("admins")}:</li>
        {admins.map(av => (
          <li key={av.person.id} className="list-inline-item">
            <PersonListing person={av.person} />
          </li>
        ))}
      </ul>
    );
  }

  badges(siteAggregates: SiteAggregates) {
    let counts = siteAggregates;
    let online = this.props.online.unwrapOr(1);
    return (
      <ul className="my-2 list-inline">
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_online", {
            count: online,
            formattedCount: numToSI(online),
          })}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={i18n.t("active_users_in_the_last_day", {
            count: counts.users_active_day,
            formattedCount: numToSI(counts.users_active_day),
          })}
        >
          {i18n.t("number_of_users", {
            count: counts.users_active_day,
            formattedCount: numToSI(counts.users_active_day),
          })}{" "}
          / {i18n.t("day")}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={i18n.t("active_users_in_the_last_week", {
            count: counts.users_active_week,
            formattedCount: counts.users_active_week,
          })}
        >
          {i18n.t("number_of_users", {
            count: counts.users_active_week,
            formattedCount: numToSI(counts.users_active_week),
          })}{" "}
          / {i18n.t("week")}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={i18n.t("active_users_in_the_last_month", {
            count: counts.users_active_month,
            formattedCount: counts.users_active_month,
          })}
        >
          {i18n.t("number_of_users", {
            count: counts.users_active_month,
            formattedCount: numToSI(counts.users_active_month),
          })}{" "}
          / {i18n.t("month")}
        </li>
        <li
          className="list-inline-item badge badge-secondary pointer"
          data-tippy-content={i18n.t("active_users_in_the_last_six_months", {
            count: counts.users_active_half_year,
            formattedCount: counts.users_active_half_year,
          })}
        >
          {i18n.t("number_of_users", {
            count: counts.users_active_half_year,
            formattedCount: numToSI(counts.users_active_half_year),
          })}{" "}
          / {i18n.t("number_of_months", { count: 6, formattedCount: 6 })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_of_users", {
            count: counts.users,
            formattedCount: numToSI(counts.users),
          })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_of_communities", {
            count: counts.communities,
            formattedCount: numToSI(counts.communities),
          })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_of_posts", {
            count: counts.posts,
            formattedCount: numToSI(counts.posts),
          })}
        </li>
        <li className="list-inline-item badge badge-secondary">
          {i18n.t("number_of_comments", {
            count: counts.comments,
            formattedCount: numToSI(counts.comments),
          })}
        </li>
        <li className="list-inline-item">
          <Link className="badge badge-primary" to="/modlog">
            {i18n.t("modlog")}
          </Link>
        </li>
      </ul>
    );
  }

  handleCollapseSidebar(i: SiteSidebar) {
    i.setState({ collapsed: !i.state.collapsed });
  }
}
