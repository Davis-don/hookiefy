import './footer.css';

function Footer() {
  return (
    <footer className="footer">
      <p>© {new Date().getFullYear()} Hookify. All rights reserved.</p>
    </footer>
  );
}

export default Footer;