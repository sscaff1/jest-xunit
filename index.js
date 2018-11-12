const process = require('process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const xml = require('xml');

function assemblies(children) {
  return {
    assemblies: [
      {
        _attr: { timestamp: Date.now() }
      },
      ...children
    ]
  };
}

function assembly(children) {
  return {
    assembly: [
      {
        _attr: {
          name: process.cwd(),
          environment: os.platform() + os.arch()
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
  constructor(globalConfig, options) {
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
          console.log(title);
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
            result: result.status,
            time: 0,
            method: 'Test'
          }
        },
        {
          output: {
            _cdata: result.failureMessages.join('\n')
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
            total: numFailingTests + numPassingTests + numPendingTests,
            passed: numPassingTests,
            failed: numFailingTests,
            skipped: numPendingTests,
            name: testFilePath,
            time: ((end - start) / 1000).toFixed(3)
          }
        },
        ...result.testResults.map(this.test)
      ]
    };
  }

  onRunComplete(contexts, results) {
    const config = this.options || {};
    const outputPath = config.outputPath || process.cwd();
    const filename = config.filename || 'test-report.xml';
    this.traitsRegex = config.traitsRegex || [];
    const data = xml([assemblies([assembly([errors(), ...results.testResults.map(this.collection)])])], {
      indent: '\t'
    });

    if (!fs.existsSync(outputPath)) {
      mkdirp.sync(outputPath);
    }
    fs.writeFileSync(path.join(outputPath, filename), data);
  }
}

module.exports = JestXUnit;
