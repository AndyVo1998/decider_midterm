const express = require('express');
const router  = express.Router();
const mailgun = require('../mailgun.js');
const PhoneNumber = require('awesome-phonenumber');
require('dotenv').config();
const twilio = require('twilio');

module.exports = (knex) => {

  var client = new twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

  function insertOptions(optionArray, id) {
    optionArray.forEach((option) => {
      let title = option.title;
      let description = option.description;
      knex('option')
      .insert({title, description, poll_id: id[0]})
      .then((err) => {
        if (err) {
          console.log(err);
        }
      }).catch((err) => {
        console.log(err);
      });
    });
  }

  function insertPhoneNumbers(phoneNumberArray, id){
    if (phoneNumberArray && phoneNumberArray.length > 0) {
      phoneNumberArray.forEach((number) => {
        knex('phone')
        .insert({number, poll_id: id[0]})
        .then((err) => {
          console.log(err);
        }).catch((err) => {
          console.log(err);
        });
      });
    }
  }


  //*********************************************
  //*** GET polls/:id/ ***
  //*********************************************


  router.get("/:id", (req, res)=> {
    let id = req.params.id;
    knex('poll')
    .innerJoin('option', 'poll.id', '=', 'option.poll_id')
    .where('poll.id', id)
    .then((results) => {
      res.render('poll', {results});
    }).catch((err) => {
      console.log(err);
    });
  });


  //*********************************************
  //*** GET polls/:id/links ***
  //*********************************************

  router.get("/:id/links", (req, res) => {
    let id = req.params.id;
    knex('phone')
    .where('poll_id', id)
    .then((results) => {

        //Loop over phone numbers and send out SMS
        results.forEach((result) => {

          let parsedNumber = new PhoneNumber( result.number, 'US' );

//          DISABLED FOR THE MOMENT, TURN ON FOR PRESENTATION
          client.messages.create({
            body: 'Help make a decison!  Vote at http://' + process.env.HOST + '/polls/' + id,
            to: parsedNumber.getNumber('e164'),
            from: process.env.TWILIO_NUMBER
          }).then((message)=>{
            console.log('MESSAGE ID: ', message.sid);
          }).catch((err) => {
            console.log("ERROR", err);
          });
        });
      }).catch((err) => {
        console.log(err);
      });
    res.render('links', {id, host: process.env.HOST});
  });

  //*********************************************
  //*** GET /polls/:id/result ***
  //*********************************************


  router.get("/:id/result", (req, res)=> {
    let id = req.params.id;
    knex('poll')
    .join('option', 'poll.id', '=', 'option.poll_id')
    .where('poll.id', id)
    .orderBy('rank', 'desc')
    .then((results) => {
      res.render('results', {results});
    }).catch((err) => {
      console.log(err);
    });
  });


  //*********************************************
  //*** POST /polls/ ***
  //*********************************************


  router.post("/", (req, res) => {
    let poll = req.body;
    //Get poll data form poll object
    let title = poll.ptitle;
    let email = poll.email;
    let optionArray = poll.options;
    let phoneNumberArray = poll.phoneNumbers;

    //Insert poll
    knex('poll')
    .returning('id')
    .insert({ptitle: title, email})
    .then((id) =>  {
      insertOptions(optionArray, id);
      insertPhoneNumbers(phoneNumberArray, id);
      res.send({redirect: '/polls/' + id +'/links'});
    }).catch((err) => {
      console.log(err);
    });
  });


  //*********************************************
  //*** PUT/ polls/:id ***
  //*********************************************

  router.put("/:id", (req, res) => {
    let id = req.params.id;
    console.log("THIS IS THE ID:", id);
    knex('poll')
    .select('email')
    .where('id', id)
    .then((result) => {
      let email = result[0].email;
      mailgun(email, id);
    }).catch((err) => {
      console.log(err);
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
