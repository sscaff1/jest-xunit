const process = require('process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const xml = require('xml');
const readPkg = require('read-pkg');

const TRAIT_REGEX = /\(Test Type:([^\)]+)\).*/g;

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
					environment: os.arch()
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

function trait(title) {
	if (title.match(TRAIT_REGEX)) {
		return {
			trait: {
				_attr: {
					name: 'Category',
					value: title.replace(TRAIT_REGEX, '$1').trim()
				}
			}
		};
	}
}

function test(result) {
	const traits = result.ancestorTitles.map(trait).filter(trait => trait);
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

function collection(result) {
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
			...result.testResults.map(test)
		]
	};
}

async function jestXunit(result) {
	const outputPath = process.cwd();
	const package = await readPkg();
	const config = package.jestXunit || {};
	const outputPath = config.outputPath || process.cwd();
	const filename = config.filename || 'test-report.xml';
	const data = xml([assemblies([assembly([errors(), ...result.testResults.map(collection)])])], { indent: '\t' });
	fs.writeFileSync(path.join(outputPath, filename), data);
	return result;
}

module.exports = jestXunit;
