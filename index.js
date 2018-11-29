const process = require('process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const xml = require('xml');
const mkdirp = require('mkdirp');

const LOCALE = 'en-US';

const XUNIT_STATES = {
  passed: 'Pass',
  failed: 'Fail',
  skipped: 'Skip'
};

function assemblies(children) {
  return {
    assemblies: [
      {
        _attr: { timestamp: new Date().toLocaleString(LOCALE) }
      },
      ...children
    ]
  };
}

function assembly({ children, total, passed, failed, skipped, time }) {
  return {
    assembly: [
      {
        _attr: {
          name: process.cwd(),
          ['config-file']: `${process.cwd()}/jest.config.js`,
          ['test-framework']: 'Jest',
          environment: os.platform() + ' ' + os.arch(),
          ['run-date']: new Date().toLocaleDateString(LOCALE),
          ['run-time']: new Date().toLocaleTimeString(LOCALE),
          time,
          total,
          passed,
          failed,
          skipped,
          errors: 0
        }
      },
      ...children
    ]
  };
}

function errors() {
  return {
    errors: {}
  };
}

class JestXUnit {
  constructor(_globalConfig, options) {
    this.options = options;
    this.traitsRegex;
    this.trait = this.trait.bind(this);
    this.test = this.test.bind(this);
    this.collection = this.collection.bind(this);
  }

  trait(title) {
    return this.traitsRegex
      .map(regexGroup => {
        const { regex, name, split } = regexGroup;
        if (title.match(regex)) {
          const value = title.replace(regex, '$1').trim();
          return {
            trait: {
              _attr: {
                name,
                value
              }
            }
          };
        }
      })
      .filter(trait => trait);
  }

  test(result) {
    const traits = result.ancestorTitles.map(this.trait).filter(trait => trait.length)[0];
    return {
      test: [
        {
          _attr: {
            name: result.title,
            type: result.ancestorTitles.join(' '),
            method: 'Test',
            time: result.duration / 1000,
            result: XUNIT_STATES[result.status]
          }
        },
        {
          output: {
            _cdata: result.failureMessages.join('').replace(/[^\w\s]/gi, '')
          }
        },
        {
          traits
        }
      ]
    };
  }

  collection(result) {
    const {
      numFailingTests,
      numPassingTests,
      numPendingTests,
      testFilePath,
      perfStats: { start, end }
    } = result;
    return {
      collection: [
        {
          _attr: {
            name: testFilePath,
            time: ((end - start) / 1000).toFixed(3),
            total: numFailingTests + numPassingTests + numPendingTests,
            passed: numPassingTests,
            failed: numFailingTests,
            skipped: numPendingTests
          }
        },
        ...result.testResults.map(this.test)
      ]
    };
  }

  onRunComplete(_contexts, results) {
    const config = this.options || {};
    const outputPath = config.outputPath || process.cwd();
    const filename = config.filename || 'test-report.xml';
    this.traitsRegex = config.traitsRegex || [];
    const data = xml(
      [
        assemblies([
          assembly({
            children: [errors(), ...results.testResults.map(this.collection)],
            total: results.numTotalTests,
            passed: results.numPassedTests,
            failed: results.numFailedTests,
            skipped: results.numPendingTests,
            time: ((Date.now() - results.startTime) / 1000).toFixed(3)
          })
        ])
      ],
      {
        indent: '\t'
      }
    );

    if (!fs.existsSync(outputPath)) {
      mkdirp.sync(outputPath);
    }
    const reportPath = path.join(outputPath, filename);
    fs.writeFileSync(reportPath, data);
    console.log('Test results written to ' + reportPath);
  }
}

module.exports = JestXUnit;
