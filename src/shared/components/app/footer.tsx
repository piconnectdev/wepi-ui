import { Component } from "inferno";
import { GetSiteResponse } from "lemmy-js-client";
interface FooterProps {
  site: GetSiteResponse;
}

export class Footer extends Component<FooterProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    return (
      <footer className="footer-distributed">
        <div className="footer-left">
          <h3>
            We<span>Pi</span>
          </h3>

          <p className="footer-links">
            <a href="#" className="link-1"></a>
          </p>

          <p className="footer-company-name">Copyleft © 2023</p>
        </div>

        <div className="footer-center">
          <div>
            <i className="fa fa-map-marker"></i>
            <p>
              <span>Tòa nhà</span> Hà Nội
            </p>
          </div>

          <div>
            <i className="fa fa-phone"></i>
            <p>+0.000.000.000</p>
          </div>

          <div>
            <i className="fa fa-envelope"></i>
            <p>
              <a href="mailto:contact@wepi.social">contact@wepi.social</a>
            </p>
          </div>
        </div>

        <div className="footer-right">
          <p className="footer-company-about text-muted">
            <span>Mạng xã hội WePi</span>
            Trực thuộc và quản lý bởi WePi.
          </p>

          <div className="footer-icons">
            <a href="#">
              <i className="fa fa-facebook"></i>
            </a>
            <a href="#">
              <i className="fa fa-twitter"></i>
            </a>
            <a href="#">
              <i className="fa fa-linkedin"></i>
            </a>
            <a href="#">
              <i className="fa fa-github"></i>
            </a>
          </div>
        </div>
      </footer>
    );
  }
}
