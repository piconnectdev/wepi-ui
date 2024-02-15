export default function getCommentIdFromProps(props: any): string | undefined {
  const id = props.match.params.comment_id;
  return id ? id : undefined;
}
