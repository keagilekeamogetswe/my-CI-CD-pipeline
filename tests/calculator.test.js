// calculator.test.js

import { describe, test, expect } from 'vitest'
import { Calculator } from '../app/calculate'

describe('Calculator', () => {
  describe('add', () => {
    test('adds multiple numbers', () => {
      expect(Calculator.add([1, 2, 3])).toBe(6)
    })

    test('returns 0 for an empty array', () => {
      expect(Calculator.add([])).toBe(0)
    })

    test('handles negative numbers', () => {
      expect(Calculator.add([10, -5, -2])).toBe(3)
    })
  })

  describe('subtract', () => {
    test('subtracts multiple numbers', () => {
      expect(Calculator.subtract([10, 2, 3])).toBe(5)
    })

    test('returns 0 for an empty array', () => {
      expect(Calculator.subtract([])).toBe(0)
    })

    test('handles negative numbers', () => {
      expect(Calculator.subtract([10, -5])).toBe(15)
    })

    test('returns the same number when one number is provided', () => {
      expect(Calculator.subtract([7])).toBe(7)
    })
  })
})