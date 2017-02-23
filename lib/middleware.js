'use strict';

/* eslint no-console: 0 */

const Router = require('express').Router;
const serveStatic = require('express').static;
const parse = require('./parser');
const ejs = require('ejs');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');

module.exports = (srcPath, options) => {
  options = options || {};

  let spec;
  let page;
  let tempdir, specfile;

  try {
    tempdir = options.tempdir || fs.mkdtempSync(path.join(os.tmpdir(), 'smartdoc-'));
    specfile = path.join(tempdir, 'spec.json');
  } catch (err) {
    console.error('Smartdoc: Cannot get temporary directory, because', err.message);
  }
  if (tempdir) {
    try {
      if (!fs.existsSync(tempdir)) { fs.mkdirpSync(tempdir); }
      if (fs.existsSync(specfile)) {
        try {
          spec = JSON.parse(fs.readFileSync(specfile, 'utf-8'));
          console.log('Smartdoc: Read cached data from', specfile);
        } catch (err) {
          console.error('Smartdoc: Cannot read cached data, because', err.message);
        }
      }
    } catch (err) {
      console.error('Smartdoc: Error with caching', err.message);
    }
  }
  if (!spec) {
    console.log('Smartdoc: Generating smartdoc data...');
    spec = parse(srcPath);
    if (tempdir) {
      try {
        fs.writeFileSync(specfile, JSON.stringify(spec, 0, 2), 'utf-8');
        console.log('Smartdoc: Save cache data as', specfile);
      } catch (err) {
        console.error('Smartdoc: Failed to cache data, because', err.message);
      }
    }
  }
  if (options.address) {
    spec.address = options.address;
  }

  const router = new Router();
  router.spec = spec;
  router.use(serveStatic(path.join(__dirname, '../public')));
  router.use('/', (req, res) => {
    const apiRoutePath = req.originalUrl;
    if (!page) {
      ejs.renderFile(path.join(__dirname, '../views/index.ejs'), {spec, options, apiRoutePath}, (err, str) => {
        if (err) {
          res.status(500).send(err.stack || err);
          return;
        }
        page = str;
        res.send(page);
      });
    } else {
      res.send(page);
    }
  });

  return router;
};
