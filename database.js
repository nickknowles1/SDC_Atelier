const { Client } = require('pg');
const {dbInfo, dbInfo2} = require('./config.js');
const dbClient = new Client(dbInfo);
const fs = require('fs');

dbClient.connect()
.then(() => console.log('Connected to Postgres Database!'))
.catch((err) => console.error(err, 'Error connecting to Postgres :('))
//.finally(() => dbClient.end())

const getProductReviewsByProductID = function(product_id) {
  return dbClient.query(`SELECT * FROM reviews WHERE product_id = ${product_id}`)
}

const getReviewPhotosByReviewIDs = function(review_ids) {
  return dbClient.query(`SELECT * FROM reviews_photos WHERE review_id IN (${review_ids})`)
}

const getRatingAndRecommendDataByProductID = function(product_id) {
  return dbClient.query(`SELECT rating, recommend FROM reviews WHERE product_id = ${product_id}`)
}

const getCharacteristicDataByProductID = async function(product_id) {
  return dbClient.query(`SELECT * FROM characteristics WHERE product_id = ${product_id}`)
}

const getValueDataByCharID = function(charID) {
  return dbClient.query(`SELECT * FROM characteristic_reviews WHERE characteristic_id = ${charID}`)
}

const postNewReview = function(obj) {
  let date = new Date().getTime();
  return dbClient.query(`INSERT INTO reviews (product_id, rating, date, summary, body, recommend,
    reviewer_name, reviewer_email) VALUES (${obj.product_id}, ${obj.rating}, ${date}, ${obj.summary},
    ${obj.body}, ${obj.recommend}, ${obj.name}, ${obj.email}) RETURNING *`)
}

const postNewReviewPhotos = function(photoURL, review_id) {
  return dbClient.query(`INSERT INTO reviews_photos (review_id, url) VALUES (${review_id}, '${photoURL}') RETURNING *`)
}

const postCharRevs = function(charID, revID, value) {
  return dbClient.query(`INSERT INTO characteristic_reviews (characteristic_id, review_id, value) VALUES
    (${charID}, ${revID}, ${value}) RETURNING *`)
}

const markReviewAsHelpfulRetrieveOld = function(review_id) {
  return dbClient.query(`SELECT helpfulness FROM reviews WHERE id = ${review_id}`)
}

const markReviewAsHelpfulPostNew = function(review_id, newValue) {
  return dbClient.query(`UPDATE reviews SET helpfulness = ${newValue} WHERE id = ${review_id} RETURNING *`)
}

const reportReview = function(review_id) {
  return dbClient.query(`UPDATE reviews SET reported = true WHERE id = ${review_id} RETURNING *`)
}


module.exports = {
  dbClient: dbClient,
  getProductReviewsByProductID: getProductReviewsByProductID,
  getReviewPhotosByReviewIDs: getReviewPhotosByReviewIDs,
  getRatingAndRecommendDataByProductID: getRatingAndRecommendDataByProductID,
  postNewReview: postNewReview,
  markReviewAsHelpfulRetrieveOld: markReviewAsHelpfulRetrieveOld,
  markReviewAsHelpfulPostNew: markReviewAsHelpfulPostNew,
  reportReview: reportReview,
  postNewReviewPhotos: postNewReviewPhotos,
  postCharRevs: postCharRevs,
  getCharacteristicDataByProductID: getCharacteristicDataByProductID,
  getValueDataByCharID: getValueDataByCharID
}

