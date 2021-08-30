
const express = require('express');
const morgan = require('morgan');
const axios = require('axios');
const db = require('./database.js');

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(express.static(__dirname + '/../client/dist'));

app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});


///////////////////////////// GET REQUEST FOR REVIEWS /////////////////////////////////////
app.get('/reviews', (req, res) => {
  // req must have a product id
  if (!req.query.product_id) {
    res.send('ERROR: No product id specified');
  }
  // these variables capture the parameters from /reviews endpoint or establish default values
  let queryPage = req.query.page || 1;
  let queryCount = req.query.count || 5;
  let querySort = req.query.sort || 'relevant';
  let queryProduct_id = req.query.product_id;
  // this is built from the first query in order to make the second
  let stringForReviewPhotosQuery = '';
  // these establish an algorithm for which page to return and how many results
  let baseMinIndex = 0;
  let baseMaxIndex = queryCount;
  if (queryPage > 1) {
    baseMinIndex = (queryPage * queryCount) - queryCount;
    baseMaxIndex = queryPage * queryCount;
  }
  // this is where the individual results are stored
  let arrayOfRetrievedReviews = [];
  // this is the eventual response object sent back to the client
  let responseObject = {
    product: queryProduct_id,
    page: queryPage,
    count: queryCount,
    results: arrayOfRetrievedReviews
  }
  // this function creates a point assignment for each review for 'relevance' based on date and helpfulness
  let helperFunctionForWeightedSortAlgorithm = function(array) {
    let oneYearAgo = new Date();
    let sixMonthsAgo = new Date();
    let threeMonthsAgo = new Date();
    let oneMonthAgo = new Date();
    let twoWeeksAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);
    sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 182);
    threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 91);
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 31);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() -14);
    for (let i = 0; i < array.length; i++) {
      array[i].relevance = array[i].helpfulness;
      array[i].date > oneYearAgo && array[i].date < sixMonthsAgo ? array[i].relevance += 5 : '';
      array[i].date > sixMonthsAgo && array[i].date < threeMonthsAgo ? array[i].relevance += 10 : '';
      array[i].date > threeMonthsAgo && array[i].date < oneMonthAgo ? array[i].relevance += 15 : '';
      array[i].date > oneMonthAgo && array[i].date < twoWeeksAgo ? array[i].relevance += 20 : '';
      array[i].date > twoWeeksAgo ? array[i].relevance += 25 : '';
    }
  };
  // first database query
  db.getProductReviewsByProductID(queryProduct_id)
  .then((results) => {
    // this constructs and formats each result
    for (let i = 0; i < results.rows.length; i++) {
      // lines 53-55 are escape clause for reviews marked as reported/ can be dev toggled as comment here
      if (results.rows[i].reported) {
        continue;
      }
      // this is is the constructor object for each review
      let individualReviewObject = {
        review_id: results.rows[i].id,
        rating: results.rows[i].rating,
        summary: results.rows[i].summary,
        recommend: results.rows[i].recommend,
        response: results.rows[i].response,
        body: results.rows[i].body,
        date: new Date(Number(results.rows[i].date)),
        reviewer_name: results.rows[i].reviewer_name,
        helpfulness: results.rows[i].helpfulness,
        relevance: 0,
        photos: []
      }
      arrayOfRetrievedReviews.push(individualReviewObject);
      // builds a string of ids for the next query for review photos
      stringForReviewPhotosQuery += results.rows[i].id + ', ';
    }
    //trims string of ids of last ', ' before query
    stringForReviewPhotosQuery = stringForReviewPhotosQuery.substring(0, stringForReviewPhotosQuery.length - 2);
  })
  .then(() => {
    // this is the second query for review photos
    db.getReviewPhotosByReviewIDs(stringForReviewPhotosQuery)
    .then((photoResults) => {
      // nested loop builds and stores photo information into corresponding individual review object
      for (let i = 0; i < arrayOfRetrievedReviews.length; i++) {
        for (let j = 0; j < photoResults.rows.length; j++) {
          if (photoResults.rows[j].review_id === arrayOfRetrievedReviews[i].review_id) {
            let item = {
              id: photoResults.rows[j].id,
              url: photoResults.rows[j].url
            }
            arrayOfRetrievedReviews[i].photos.push(item);
          }
        }
      }
    })
    .then(() => {
      // default sort by relevance
      helperFunctionForWeightedSortAlgorithm(arrayOfRetrievedReviews);
      arrayOfRetrievedReviews.sort((a,b) => {
        if (a.relevance < b.relevance) {
          return 1;
        } else {
          return -1;
        }
      });
      // sort by helpfulness if applicable
      if (querySort === 'helpful') {
        arrayOfRetrievedReviews.sort((a,b) => {
          if (a.helpfulness < b.helpfulness) {
            return 1;
          } else {
            return -1;
          }
        });
      }
      // sort by newest if applicable
      if (querySort === 'newest') {
        arrayOfRetrievedReviews.sort((a,b) => {
          if (a.date < b.date) {
            return 1;
          } else {
            return -1;
          }
        });
      }
      // trims results to match endpoint parameters
      responseObject.results = arrayOfRetrievedReviews.slice(baseMinIndex, baseMaxIndex);
      // sends final product
      res.send(responseObject);
    })
    .catch((err) => {
      res.send(err);
    })
  })
  .catch((err) => {
    res.send(err);
  })

});
/**************************** END OF GET REQUEST FOR REVIEWS **************************/



/////////////////////////// GET REQUEST FOR REVIEW META DATA //////////////////////////
app.get('/reviews/meta', (req, res) => {
  let queryProduct_id = req.query.product_id;
  // this is the eventual response object sent back to the client
  let responseObject = {
    product_id: queryProduct_id,
    ratings: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
    recommended: {0: 0, 1: 0},
    characteristics: {}
  };
  // first query loops and assigns relevant data to response object
  db.getRatingAndRecommendDataByProductID(queryProduct_id)
  .then((results) => {
    for (let i = 0; i < results.rows.length; i++) {
      responseObject.ratings[results.rows[i].rating]++;
      if (results.rows[i].recommend === true) {
        responseObject.recommended[1]++;
      } else {
        responseObject.recommended[0]++;
      }
    }
  })
  // second query gathers initial characteristic data and loops over it
  .then(() => {
    db.getCharacteristicDataByProductID(queryProduct_id)
    .then((charData) => {
      for (let i = 0; i < charData.rows.length; i++) {
        let valueAggregate = 0;
        // this query is done for each iteration
        db.getValueDataByCharID(charData.rows[i].id)
        .then((valueData) => {
          // nested loop constructs an aggregate of each characteristic value
          for (let j = 0; j < valueData.rows.length; j++) {
            valueAggregate += valueData.rows[j].value;
          }
          valueAggregate /= valueData.rows.length;
          // if (!valueAggregate) {
          //   valueAggregate = 0;
          // }
          responseObject.characteristics[charData.rows[i].name] =
          {id: charData.rows[i].id, value: !valueAggregate ? 0 : valueAggregate.toFixed(4)};
          if (i === charData.rows.length - 1) {
            // final product is sent from here only if on last iteration
            res.send(responseObject);
          }
        })
      }
    })
  })
  .catch((err) => {
    res.send(err);
  })
});
/************************* END OF GET REQUEST FOR REVIEW META DATA **************************/



////////////////////////// POST REQUEST TO POST A NEW REVIEW /////////////////////////////////
app.post('/reviews', (req, res) => {
  let responseObject;
  let newReviewID;
  // these parse both the photos array and characteristic reviews object from query string
  let photoArray = req.query.photos;
  photoArray = JSON.parse(photoArray);
  let charRevsObj = req.query.characteristics;
  charRevsObj = JSON.parse(charRevsObj)
  // first query posts bulk of review and captures the new review_id in a variable for use in next queries
  db.postNewReview(req.query)
  .then((results) => {
    //these populate the response object for confirmation of successful post and retrieves new id for the new review
    responseObject = results.rows[0];
    responseObject.photos = [];
    responseObject.characteristics = [];
    newReviewID = results.rows[0].id
    // promise chain in case there are photos to upload as well
    if (photoArray.length) {
      // loop to insert photos and then char review data
      for (let i = 0; i < photoArray.length; i++) {
        db.postNewReviewPhotos(photoArray[i], newReviewID)
        .then((results2) => {
          responseObject.photos.push(results2.rows[0]);
          if (i === photoArray.length - 1) {
            let count = 0
            let stop = Object.keys(charRevsObj).length;
            for (let key in charRevsObj) {
              db.postCharRevs(key, newReviewID, charRevsObj[key])
              .then((results3) => {
                count++;
                responseObject.characteristics.push(results3.rows[0]);
                if (count === stop) {
                  res.send(responseObject);
                }
              })
              .catch((err) => {
                res.send(err);
              })
            }
          }
        })
        .catch((err) => {
          res.send(err);
        })
      }
    } else {
      // this loops continues to insert char review data in case no photos to add
      let count = 0
      let stop = Object.keys(charRevsObj).length;
      for (let key in charRevsObj) {
        db.postCharRevs(key, newReviewID, charRevsObj[key])
        .then((results4) => {
          count++;
          responseObject.characteristics.push(results4.rows[0]);
          if (count === stop) {
            res.send(responseObject);
          }
        })
        .catch((err) => {
          res.send(err);
        })
      }
    }
  })
  .catch((err) => {
    res.send(err);
  })
});
/********************* END OF POST REQUEST TO POST A NEW REVIEW ***********************/



//////////////////////// PUT REQUEST TO MARK A REVIEW AS HELPFUL /////////////////////////
app.put('/reviews/:review_id/helpful', (req, res) => {
  let helpfulnessValueToBeUpdated;
  //this query retrieves the old value
  db.markReviewAsHelpfulRetrieveOld(req.query.review_id)
  .then((results) => {
    // updates the value by 1
    helpfulnessValueToBeUpdated = results.rows[0].helpfulness + 1;
  })
  .then(() => {
    // this query inserts the new value
    db.markReviewAsHelpfulPostNew(req.query.review_id, helpfulnessValueToBeUpdated)
    .then((newValue) => {
      // confirmation is sent back to client
      res.send(newValue.rows[0])
    })
  })
  .catch((err) => {
    res.send(err);
  })
});
/********************** END OF PUT REQUEST TO MARK A REVIEW AS HELPFUL *********************/



//////////////////////// PUT REQUEST TO REPORT A REVIEW /////////////////////////////////////
app.put('/reviews/:review_id/report', (req, res) => {
  // this query simply updates the corresponding 'reported' property to true
  db.reportReview(req.query.review_id)
  .then((reportedReview) => {
    res.send(reportedReview.rows[0]);
  })
  .catch((err) => {
    res.send(err);
  })
});
/********************** END OF PUT REQUEST TO REPORT A REVIEW ******************************/



