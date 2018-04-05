const express = require('express');
const router  = express.Router();
const mailgun = require('../mailgun.js')


module.exports = (knex) => {

  router.get("/", (req, res) => {
    console.log("GET /");
    res.render('index');
  });

  router.get("/polls/:id", (req, res)=> {
    let id = req.params.id;
    console.log("/polls/:id: ", id);
    //res.send("Succesful GET /:id with id: " + id);
    knex('poll')
      .innerJoin('option', 'poll.id', '=', 'option.poll_id')
      .where('poll.id', id)
      .then((results) => {
        console.log(results);
        let templateVars = {results: results};
        res.render('poll', templateVars);
      });
  });

  router.get("/polls/:id/result", (req, res)=> {
    let id = req.params.id;
    console.log("/polls/:id/result: ", id);
    res.send("Succesful GET /polls/:id with id: " + id);
    knex('poll')
      .join('option', 'poll.id', '=', 'option.poll_id')
      .where('poll.id', id)
      .then((results) => {
        console.log(results);
        let templateVars = {results: results};
        res.render('results', templateVars);
      });
  });

  router.post("/polls/", (req, res) => {
    let poll = JSON.parse(req.body.poll);
    console.log("POST / ", poll);
    //Cet poll data form poll object
    let title = poll.title;
    let email = poll.email;
    let optionArray = poll.options;


    //Insert poll
    knex('poll')
      .returning('id')
      .insert({title: title, email: email})
      .then((id) =>  {
        console.log('Succesful insert, ID is: ' + id);

        //Handle inseting options here
        optionArray.forEach((option) => {
          let title = option.title;
          let description = option.description;
          console.log("FOR EACH");
          knex('option')
            .insert({title: title, description: description, poll_id: id[0]})
            .then((err) => {
              if (err) {
                console.log(err);
              }
          });
        });
      });

    res.send("Succesful POST /polls with " + poll);
  });

  router.put("/polls/:id", (req, res) => {
    let id = req.params.id;

    knex('poll')
      .select('email')
      .where('id', id)
      .then((result) => {
        let email = result[0].email;
        mailgun(email);
        console.log(email);
      });

    let optionsArray = JSON.parse(req.body.options);
    console.log(typeof optionsArray);
    optionsArray.forEach((option) => {
      console.log('OPTION ID: ', option.option_id);
      console.log('WEIGHT: ', option.weight);
    });
    res.send("Succesful PUT /polls/:id with id: " + id);
  });
  return router;
};
