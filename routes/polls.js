const express = require('express');
const router  = express.Router();
const mailgun = require('../mailgun.js');
const PhoneNumber = require('awesome-phonenumber');
require('dotenv').config();


//Twilio config
const twilio = require('twilio');
const accountSid = 'AC7b9844743f81862b10662b3d94596ab5';
const authToken = '7489886f8680955b9485db6510d772b6';


module.exports = (knex) => {

  var client = new twilio(accountSid, authToken);


  router.get("/", (req, res) => {
    res.render('index');
  });

  router.get("/polls/:id", (req, res)=> {
    let id = req.params.id;
    knex('poll')
    .innerJoin('option', 'poll.id', '=', 'option.poll_id')
    .where('poll.id', id)
    .then((results) => {
      res.render('poll', {results});
    });
  });

  router.get("/polls/:id/links", (req, res) => {
    let id = req.params.id;
    //Send out SMS alerts
    knex('phone')
    .where('poll_id', id)
    .then((results) => {

        //Loop over phone numbers and send out SMS
         results.forEach((result) => {

          let parsedNumber = new PhoneNumber( result.number, 'US' );

          //DISABLED FOR THE MOMENT, TURN ON FOR PRESENTATION
          // client.messages.create({
          //   body: 'Help make a decison!  Vote at http://10.30.30.23:8080/polls/' + id,
          //   to: parsedNumber.getNumber('e164'),
          //   from: process.env.TWILIO_NUMBER
          // }).then((message)=>{
          //   console.log('MESSAGE ID: ', message.sid);
          // }).catch((err) => {
          //   console.log("ERROR", err);
          // });
         });
      });
    res.render('links', {id});
  });

  router.get("/polls/:id/result", (req, res)=> {
    let id = req.params.id;
    knex('poll')
    .join('option', 'poll.id', '=', 'option.poll_id')
    .where('poll.id', id)
    .orderBy('rank', 'desc')
    .then((results) => {
      console.log(results);
      res.render('results', {results});
    });
  });

  router.post("/polls/", (req, res) => {
    let poll = req.body;
    //Cet poll data form poll object
    let title = poll.ptitle;
    let email = poll.email;
    let optionArray = poll.options;
    let phoneNumberArray = poll.phoneNumbers;

    //Insert poll
    knex('poll')
    .returning('id')
    .insert({ptitle: title, email})
    .then((id) =>  {
        //Handle inseting options here
        optionArray.forEach((option, index) => {
          let title = option.title;
          let description = option.description;
          knex('option')
          .insert({title, description, poll_id: id[0]})
          .then((err) => {
            if (err) {
              console.log(err);
            }
          });
        });

        phoneNumberArray.forEach((number) => {
          knex('phone')
          .insert({number, poll_id: id[0]})
          .then((err) => {
            console.log(err);
          });
        });

        res.send({redirect: '/polls/' + id +'/links'});
      });
  });

  router.put("/polls/:id", (req, res) => {
    let id = req.params.id;
    console.log('THIS IS A PUT', req.body);
    knex('poll')
    .select('email')
    .where('id', id)
    .then((result) => {
      let email = result[0].email;
      mailgun(email, id);
    });

    let optionsArray = req.body.data;
    optionsArray.forEach((option) => {
      knex('option')
      .increment('rank', option.rank)
      .where('id', option.option_id)
      .then((err) => {
        console.log(err);
      });
    });
    res.send({redirect: '/'});
  });
  return router;
};
