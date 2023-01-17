import classNames from "classnames";
import { Component, linkEvent } from "inferno";
import { Language } from "lemmy-js-client";
import { i18n } from "../../i18next";
import { UserService } from "../../services/UserService";
import { randomStr, selectableLanguages } from "../../utils";
import { Icon } from "./icon";

interface LanguageSelectProps {
  allLanguages: Language[];
  siteLanguages: number[];
  selectedLanguageIds?: number[];
  multiple: boolean;
  onChange(val: number[]): any;
  showAll?: boolean;
  showSite?: boolean;
  iconVersion?: boolean;
}

export class LanguageSelect extends Component<LanguageSelectProps, any> {
  private id = `language-select-${randomStr()}`;

  constructor(props: any, context: any) {
    super(props, context);
  }

  componentDidMount() {
    this.setSelectedValues();
  }

  // Necessary because there is no HTML way to set selected for multiple in value=
  setSelectedValues() {
    let ids = this.props.selectedLanguageIds?.map(toString);
    if (ids) {
      let select = (document.getElementById(this.id) as HTMLSelectElement)
        .options;
      for (let i = 0; i < select.length; i++) {
        let o = select[i];
        if (ids.includes(o.value)) {
          o.selected = true;
        }
      }
    }
  }

  render() {
    return this.props.iconVersion ? (
      this.selectBtn
    ) : (
      <div className="form-group row">
        <label
          className={classNames("col-form-label", {
            "col-sm-3": this.props.multiple,
            "col-sm-2": !this.props.multiple,
          })}
          htmlFor={this.id}
        >
          {i18n.t(this.props.multiple ? "language_plural" : "language")}
        </label>
        <div
          className={classNames("input-group", {
            "col-sm-9": this.props.multiple,
            "col-sm-10": !this.props.multiple,
          })}
        >
          {this.selectBtn}
          {this.props.multiple && (
            <div className="input-group-append">
              <button
                className="input-group-text"
                onClick={linkEvent(this, this.handleDeselectAll)}
              >
                <Icon icon="x" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  get selectBtn() {
    let selectedLangs = this.props.selectedLanguageIds;
    let filteredLangs = selectableLanguages(
      this.props.allLanguages,
      this.props.siteLanguages,
      this.props.showAll,
      this.props.showSite,
      UserService.Instance.myUserInfo
    );

    return (
      <select
        className={classNames("lang-select-action", {
          "form-control custom-select": !this.props.iconVersion,
          "btn btn-sm text-muted": this.props.iconVersion,
        })}
        id={this.id}
        onChange={linkEvent(this, this.handleLanguageChange)}
        aria-label="action"
        multiple={this.props.multiple}
      >
        {filteredLangs.map(l => (
          <option
            key={l.id}
            value={l.id}
            selected={selectedLangs?.includes(l.id)}
          >
            {l.name}
          </option>
        ))}
      </select>
    );
  }

  handleLanguageChange(i: LanguageSelect, event: any) {
    let options: HTMLOptionElement[] = Array.from(event.target.options);
    let selected: number[] = options
      .filter(o => o.selected)
      .map(o => Number(o.value));

    i.props.onChange(selected);
  }

  handleDeselectAll(i: LanguageSelect, event: any) {
    event.preventDefault();
    i.props.onChange([]);
  }
}
