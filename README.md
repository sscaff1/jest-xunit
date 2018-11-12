# Jest XUnit

jest-xunit is a reporter for Jest that produces an XML in xunit format.

## Installation

```
npm i -D jest-xunit
```

Then in your jest config specify jest-xunit as a reporter:

```js
{
  ...
  reporters: [
		'default', // keep the default reporter
		[
			'jest-xunit',
			{
				traitsRegex: [
					{ regex: /\(Test Type:([^,)]+)(,|\)).*/g, name: 'Category' },
					{ regex: /.*Test Traits: ([^)]+)\).*/g, name: 'Type' }
				]
			}
		]
	]
  ...
}
```

## Config

| configKey   | Description                                                                                                                                 | Default          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| filename    | The filename of the results. The reporter outputs xml format                                                                                | test-results.xml |
| outputPath  | The path where the test results should be generated.                                                                                        | process.cwd()    |
| traitsRegex | An array of objects with the following keys: _ regex - A regex to be used to extract the traits _ name - The name of the extract trait type | []               |
