import { useEffect, useState } from "react";
import axios from "axios";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import "./Notifications.css";


function Notifications() {

  const navigate = useNavigate();

  const [notifications, setNotifications] =
    useState([]);

  const [loading, setLoading] =
    useState(true);
  const darkMode =
    localStorage.getItem("darkMode") === "true";


  const fetchNotifications = async () => {

    try {

      const res = await axios.get(
        "https://pingme-api-new.onrender.com/api/notifications",
        {
          headers: {
            Authorization:
              `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );


      setNotifications(
        res.data.notifications
      );


    } catch (error) {

      console.log(
        "NOTIFICATION ERROR:",
        error
      );


    } finally {

      setLoading(false);

    }

  };


  const markAsRead = async () => {

    try {

      await axios.put(
        "https://pingme-api-new.onrender.com/api/notifications/read",
        {},
        {
          headers: {
            Authorization:
              `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );


    } catch (error) {

      console.log(
        "MARK READ ERROR:",
        error
      );

    }

  };


  useEffect(() => {

    fetchNotifications();

    markAsRead();

  }, []);


  return (

    <div
      className={`notifications-container ${darkMode ? "dark" : ""
        }`}
    >

      <div className="notifications-header">

        <button
          onClick={() => navigate("/home")}
        >

          <FaArrowLeft />

        </button>


        <h2>
          Notifications
        </h2>

      </div>


      {
        loading ? (

          <p>
            Loading notifications...
          </p>

        ) : notifications.length === 0 ? (

          <p>
            No notifications yet 🔔
          </p>

        ) : (

          notifications.map((notification) => (

            <div
              key={notification._id}
              className="notification-card"
            >

              <img
                src={
                  notification.sender.profilePic ||
                  "/default-avatar.png"
                }
                alt={notification.sender.name}
                className="notification-avatar"
                onError={(e) => {
                  e.target.src = "/default-avatar.png";
                }}
              />


              <div>

                <h4>
                  {notification.sender.username}
                </h4>


                <p>
                  {notification.message}
                </p>


              </div>


            </div>

          ))

        )

      }

    </div>

  );

}


export default Notifications;