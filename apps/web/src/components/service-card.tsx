import React from 'react';
import './ServiceCard.css';

const ServiceCard = ({ image, title, provider, price, rating, location }) => {
    return (
        <div className="service-card">
            <img src={image} alt={title} className="service-image" />
            <h2 className="service-title">{title}</h2>
            <p className="provider-name">{provider}</p>
            <p className="price">${price}</p>
            <div className="rating">
                {Array.from({ length: 5 }, (v, i) => (
                    <span key={i} className={i < rating ? 'star filled' : 'star'}>★</span>
                ))}
            </div>
            <span className="verified-badge">Verified</span>
            <p className="location">{location}</p>
            <button className="book-now">Book Now</button>
        </div>
    );
};

export default ServiceCard;