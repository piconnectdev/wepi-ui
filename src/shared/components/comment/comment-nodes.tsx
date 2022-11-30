import { Option } from "@sniptt/monads";
import { Component } from "inferno";
import {
  CommentNode as CommentNodeI,
  CommunityModeratorView,
  Language,
  PersonViewSafe,
} from "lemmy-js-client";
import { CommentViewType } from "../../interfaces";
import { CommentNode } from "./comment-node";

interface CommentNodesProps {
  nodes: CommentNodeI[];
  moderators: Option<CommunityModeratorView[]>;
  admins: Option<PersonViewSafe[]>;
  maxCommentsShown: Option<number>;
  noBorder?: boolean;
  noIndent?: boolean;
  viewOnly?: boolean;
  locked?: boolean;
  markable?: boolean;
  showContext?: boolean;
  showCommunity?: boolean;
  enableDownvotes?: boolean;
  viewType: CommentViewType;
  allLanguages: Language[];
}

export class CommentNodes extends Component<CommentNodesProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    let maxComments = this.props.maxCommentsShown.unwrapOr(
      this.props.nodes.length
    );

    return (
      <div className="comments">
        {this.props.nodes.slice(0, maxComments).map(node => (
          <CommentNode
            key={node.comment_view.comment.id}
            node={node}
            noBorder={this.props.noBorder}
            noIndent={this.props.noIndent}
            viewOnly={this.props.viewOnly}
            locked={this.props.locked}
            moderators={this.props.moderators}
            admins={this.props.admins}
            markable={this.props.markable}
            showContext={this.props.showContext}
            showCommunity={this.props.showCommunity}
            enableDownvotes={this.props.enableDownvotes}
            viewType={this.props.viewType}
            allLanguages={this.props.allLanguages}
          />
        ))}
      </div>
    );
  }
}
