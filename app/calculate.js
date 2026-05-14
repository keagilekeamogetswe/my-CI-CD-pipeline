export const Calculator = (() => {
  return {
    add(numbers = []) {
      let summation = 0
      numbers.forEach(num => summation += num)
      return summation
    },

    subtract(numbers = []) {
      if (numbers.length === 0) return 0

      let result = numbers[0]

      numbers.slice(1).forEach(num => result -= num)

      return result
    }
  }
})()