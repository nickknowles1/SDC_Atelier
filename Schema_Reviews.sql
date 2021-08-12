CREATE DATATBASE if not exists sdc_reviews;

\c sdc_reviews;

CREATE TABLE characteristic_reviews (
  id integer,
  characteristic_id integer,
  review_id integer,
  value smallint
);

CREATE TABLE characteristics (
  id integer,
  product_id integer,
  name varchar
);

CREATE TABLE features (
  id integer,
  product_id integer,
  feature varchar,
  value varchar
);

CREATE TABLE reviews_photos (
  id integer,
  review_id integer,
  url varchar
);

CREATE TABLE reviews (
  id integer,
  product_id integer,
  rating smallint,
  date varchar,
  summary varchar,
  body varchar,
  recommend boolean,
  reported boolean,
  reviewer_name varchar,
  reviewer_email varchar,
  response varchar default null,
  helpfulness smallint
);


-- CREATE TABLE reviews (
--   review_id serial,
--   product_id smallint,
--   summary varchar(250),
--   rating smallint,
--   recommend boolean,
--   email varchar(100),
--   body text,
--   date_posted date,
--   reviewer_name varchar(40),
--   photos text,
--   characteristics json,
--   reported boolean,
--   PRIMARY KEY (review_id)
-- );

-- CREATE TABLE reviews_meta (
--   product_id smallint,
--   helpfulness json,
--   ratings json,
--   recommended json,
--   characteristics json,
--   PRIMARY KEY (product_id)
-- );

