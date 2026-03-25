import React from 'react';
import './footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-content">
                <div className="company-links">
                    <a href="https://example.com/about">About Us</a>
                    <a href="https://example.com/contact">Contact</a>
                    <a href="https://example.com/terms">Terms of Service</a>
                    <a href="https://example.com/privacy">Privacy Policy</a>
                </div>
                <div className="social-media">
                    <a href="https://facebook.com/example"><i className="fab fa-facebook"></i></a>
                    <a href="https://twitter.com/example"><i className="fab fa-twitter"></i></a>
                    <a href="https://instagram.com/example"><i className="fab fa-instagram"></i></a>
                </div>
            </div>
            <div className="footer-bottom">
                <p>&copy; {new Date().getFullYear()} Company Name. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;