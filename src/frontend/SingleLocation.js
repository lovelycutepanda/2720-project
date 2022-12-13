import { useEffect, useState } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import './SingleLocation.css';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import API from './FetchAPI.js';
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax


const SingleLocation = () => {

  const navigate = useNavigate();

  const { locationId } = useParams();

  const [favourite, setFavourite, locationList, searchLocationList, setSearchLocationList, map] = useOutletContext();

  const [location, setLocation] = useState({});
  const [comment, setComment] = useState("");
  const [commentList, setCommentList] = useState([]);
  const [isFavourite, setIsFavourite] = useState(false);

  /////////////////////////////////////////////////////////////////////////
  // Zoom in the specific location with camera //

  // mapboxgl.clearPrewarmedResources();
  // mapboxgl.clearStorage();

  useEffect(() => {
    return () => {
      map.current.zoomTo(9.5, {
        duration: 1000,
        center: [114.1315, 22.3725]
      });
    };
  }, [])

  /////////////////////////////////////////////////////////////////////////

  // back to previous page
  const back = () => {
    navigate('/user');
  }

  // check if favourite location is empty
  useEffect(() => {
    if (!favourite.length)
      return;
    setIsFavourite(favourite.indexOf(parseInt(locationId)) !== -1);
  }, [favourite]);

  // component did mount
  useEffect(() => {
    if (!locationList.length)
      return;
    let loc = locationList.find((loc) => loc.locationId === parseInt(locationId));
    if (!loc)
      back();
    setLocation(loc);
    map.current.zoomTo(13, {
      duration: 1000,
      center: [loc.position.longitude, loc.position.latitude]
    });

    API.loadComments(parseInt(locationId))
      .then((comments) => {
        console.log("comments:", comments);
        setCommentList(comments.map((c) => {
          return {
            user: c.user.username,
            message: c.message
          }
        }))
      });
    setSearchLocationList([loc]);
  }, [locationList]);

  // send comment to database and clear the textarea
  const sendSubmit = async () => {

    if (!comment)
      // if the comment box is empty, we dont update
      return toast.error("There is no comment.");

    let newComment = {
      user: sessionStorage.getItem("user"),
      message: comment
    };
    // send newComment to database

    const comments = [...commentList];
    comments.push(newComment);
    setCommentList(comments);

    await fetch(`${process.env.REACT_APP_SERVER_URL}/user/location/${locationId}`, {
      method: "POST",
      headers: new Headers({
        "Content-Type": 'application/json',
      }),
      body: JSON.stringify({
        newComment: newComment,
      })
    })
      .then((res) => res.json())
      .then((obj) => {
        // if error is found
        if (obj.err)
          toast.error(obj.err);
        else
          toast.success(obj.msg);
        setComment("");
      })



  }

  // add favourite location
  const addFavourite = () => {
    fetch(`${process.env.REACT_APP_SERVER_URL}/user/addfavourite`, {
      method: "PUT",
      headers: new Headers({
        "Content-Type": 'application/json',
      }),
      body: JSON.stringify({
        username: sessionStorage.getItem("user"),
        locationId: parseInt(locationId)
      })
    })
    if (isFavourite)
      setFavourite(favourite.filter((locId) => locId !== parseInt(locationId)));
    else
      setFavourite([...favourite, parseInt(locationId)]);
    setIsFavourite(!isFavourite);
  }

  return (
    <div>
      <h2 className="mt-5">{location.name}<span className="badge bg-secondary mx-1">{locationId}</span></h2>

      <button className='btn btn-outline-dark me-2' onClick={() => back()}>Return to all locations</button>
      <button className='btn btn-outline-dark me-2' onClick={() => addFavourite()}>{isFavourite ? "Remove from favourite" : "Add to favourite"}</button>

      <div>

      </div>

      <table className="container-fluid">
        <thead>
          <tr>
            <th>Title</th>
            <th>Venue</th>
            <th>Date</th>
            <th>Description</th>
            <th>Presenter</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {location?.eventList?.map(({ title, date, description, presenter, price }, index) => {
            let simplifiedDate = [];
            for (let d in date) {
              if (simplifiedDate.length === 0
                || simplifiedDate[simplifiedDate.length - 1].slice(4, 6) !== date[d].slice(4, 6)
                || (simplifiedDate[simplifiedDate.length - 1].slice(6).length === 2 && Number(simplifiedDate[simplifiedDate.length - 1].slice(6)) + 1 !== Number(date[d].slice(6)))
                || (simplifiedDate[simplifiedDate.length - 1].slice(6).length === 4 && Number(simplifiedDate[simplifiedDate.length - 1].slice(9)) + 1 !== Number(date[d].slice(6)))) {
                /* This matches 4 cases:
                (1) No elements in simplifiedDate 
                (2) New element's (d) month does not match that of last element
                (3) Last element's date is not a range (i.e. not xx~yy) and the new date (d) is not the next day
                    e.g. last element is 20220708 then d is 20220710
                (4) Last element's date is a range (i.e. xx~yy) and the new date (d) is not the next day
                    e.g. last element is 20220708~10 (i.e. 08~10/07/2022), then d is 20220712
                Any of these 4 cases results in a new element in simplifiedDate
                */
                simplifiedDate.push(date[d]);
              } else {
                //The remaining case must be the new date (d) is the next day of the last element of simplifiedDate
                if (simplifiedDate[simplifiedDate.length - 1].length === 8) {
                  //date is not a range (i.e. not xx~yy)
                  simplifiedDate[simplifiedDate.length - 1] += '~' + date[d].slice(6);
                  //console.log('~' + date[d].slice(6));
                } else {
                  //date is a range
                  simplifiedDate[simplifiedDate.length - 1] = simplifiedDate[simplifiedDate.length - 1].slice(0, 9) + date[d].slice(6);
                  //console.log(simplifiedDate[simplifiedDate.length - 1].slice(0, 9) + date[d].slice(6));
                }
                //console.log(simplifiedDate);
              }
            }
            return (
              <tr key={index}>
                <td>{title}</td>
                <td>{location.name}</td>
                <td>{simplifiedDate.map((str) => `${str.slice(6)}/${str.slice(4, 6)}/${str.slice(0, 4)}`).join(', ')}</td>
                <td>{description}</td>
                <td>{presenter}</td>
                <td>{price}</td>
              </tr>)
          })}
        </tbody>
      </table>

      <div>
        <hr />
        <h2>Comments: </h2>
        <div className='comment'>
          <div className="conatiner-fluid mx-2">
            {commentList?.map(({ user, message }, index) => {
              return (
                <div className='row' key={index}>
                  {/* <div className='col-auto' ><span id='userNameBg'>{user}</span></div>
                  <div className='col-auto' id='userMessageBg'><p>{message}</p></div> */}
                  <div className='col-auto' id='userMessageBg'>
                    <span className='badge text-bg-light rounded-pill'>{user}</span>
                    <br />
                    <p>{message}</p>
                    </div>
                  
                </div>
                // <p key={index}>{user} commented: {message}</p>
              )
            })}
          </div>
        </div>

        <h2>Leave your comment below: </h2>
        <br />
        <form>
          <textarea className='submit-comment form-control' placeholder='Enter your comment' id='commentContent'
            value={comment} onChange={(e) => setComment(e.target.value)}></textarea>
        </form>
        <button className='btn btn-outline-dark m-2' onClick={() => sendSubmit()}>Submit</button>
      </div>
      <ToastContainer position="bottom-right" autoClose={3000} pauseOnFocusLoss={false} />
    </div>

  );
}

export default SingleLocation;