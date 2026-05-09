const fs = require('fs');

const extraProblems = [
    // Switch (need 4)
    { id: 36, title: "Traffic Light", category: "Switch", difficulty: "Beginner", statement: "Given R, Y, or G, print 'Stop', 'Wait', 'Go'.", hint: "switch(char) { case 'R': ... }", output: "Input: 'R' -> Output: Stop" },
    { id: 37, title: "Vowel Switch", category: "Switch", difficulty: "Beginner", statement: "Check if char is vowel using fallthrough in switch.", hint: "case 'a': case 'e': ... printf('Vowel');", output: "Input: 'a' -> Output: Vowel" },
    { id: 38, title: "Menu Driven DB", category: "Switch", difficulty: "Intermediate", statement: "Create a simple CRUD menu (1: Add, 2: Read, 3: Update, 4: Delete).", hint: "switch(choice)", output: "Input: 2 -> Output: Read selected" },
    { id: 39, title: "HTTP Status Codes", category: "Switch", difficulty: "Intermediate", statement: "Given status code (200, 404, 500), print the meaning.", hint: "switch(code)", output: "Input: 404 -> Output: Not Found" },

    // For Loop (need 4)
    { id: 40, title: "Sum of N", category: "For Loop", difficulty: "Beginner", statement: "Find sum of first N natural numbers using a loop.", hint: "for(int i=1; i<=n; i++) sum += i;", output: "Input: 5 -> Output: 15" },
    { id: 41, title: "Array Minimum", category: "For Loop", difficulty: "Beginner", statement: "Find the minimum element in an array.", hint: "Initialize min = arr[0], loop through rest.", output: "Input: [4,1,5] -> Output: 1" },
    { id: 42, title: "Linear Search", category: "For Loop", difficulty: "Beginner", statement: "Find index of an element in an array.", hint: "Loop and check arr[i] == target.", output: "Input: [10,20], target=20 -> Output: 1" },
    { id: 43, title: "Collatz Sequence", category: "For Loop", difficulty: "Intermediate", statement: "Print Collatz sequence up to 10 iterations for a number.", hint: "if even: n/2, if odd: 3n+1.", output: "Input: 6 -> Output: 6, 3, 10, 5..." },

    // While Loop (need 3)
    { id: 44, title: "Count Digits", category: "While Loop", difficulty: "Beginner", statement: "Count number of digits in an integer.", hint: "while(n!=0) { n/=10; count++; }", output: "Input: 1234 -> Output: 4" },
    { id: 45, title: "Palindrome Number", category: "While Loop", difficulty: "Intermediate", statement: "Check if a number is palindrome.", hint: "Reverse it using while loop, then compare with original.", output: "Input: 121 -> Output: Palindrome" },
    { id: 46, title: "Armstrong Number", category: "While Loop", difficulty: "Intermediate", statement: "Check if a number is an Armstrong number.", hint: "Sum of cubes of digits equals original number.", output: "Input: 153 -> Output: True" },

    // Nested Loops (need 5)
    { id: 47, title: "Number Pyramid", category: "Nested Loops", difficulty: "Advanced", statement: "Print a pyramid of numbers (1, 12, 123).", hint: "Outer loop for rows, inner for numbers.", output: "Input: 3 -> Output: 1 \n 1 2 \n 1 2 3" },
    { id: 48, title: "Pascal's Triangle", category: "Nested Loops", difficulty: "Advanced", statement: "Print first N rows of Pascal's triangle.", hint: "Use binomial coefficient formula inside nested loops.", output: "Input: 3 -> Output: 1 \n 1 1 \n 1 2 1" },
    { id: 49, title: "Matrix Transpose", category: "Nested Loops", difficulty: "Intermediate", statement: "Transpose a 2D matrix.", "hint": "Swap arr[i][j] with arr[j][i].", output: "Input: [[1,2],[3,4]] -> Output: [[1,3],[2,4]]" },
    { id: 50, title: "Matrix Addition", category: "Nested Loops", difficulty: "Beginner", statement: "Add two matrices.", "hint": "res[i][j] = a[i][j] + b[i][j]", output: "Input: A, B -> Output: A+B" },
    { id: 51, title: "Find Duplicates", category: "Nested Loops", difficulty: "Intermediate", statement: "Find duplicate elements in an array using two loops (O(N^2)).", "hint": "For i to n, For j=i+1 to n, if arr[i]==arr[j].", output: "Input: [1,2,3,2] -> Output: 2" },

    // Bitwise (need 4)
    { id: 52, title: "Odd or Even (Bitwise)", category: "Bitwise Operations", difficulty: "Beginner", statement: "Check if even or odd using bitwise AND.", "hint": "if (n & 1) odd else even.", output: "Input: 5 -> Output: Odd" },
    { id: 53, title: "Multiply by 2", category: "Bitwise Operations", difficulty: "Beginner", statement: "Multiply a number by 2 using bitwise shifts.", "hint": "n << 1", output: "Input: 5 -> Output: 10" },
    { id: 54, title: "Divide by 2", category: "Bitwise Operations", difficulty: "Beginner", statement: "Divide a number by 2 using bitwise shifts.", "hint": "n >> 1", output: "Input: 10 -> Output: 5" },
    { id: 55, title: "Swap using XOR", category: "Bitwise Operations", difficulty: "Intermediate", statement: "Swap two integers using XOR without a temp variable.", "hint": "a^=b; b^=a; a^=b;", output: "Input: a=5, b=10 -> Output: a=10, b=5" },

    // Pointers & Memory (need 4)
    { id: 56, title: "String Length (Pointers)", category: "Pointers & Memory", difficulty: "Beginner", statement: "Find length of string using a pointer.", "hint": "while(*ptr != '\0') ptr++;", output: "Input: 'hello' -> Output: 5" },
    { id: 57, title: "Copy String", category: "Pointers & Memory", difficulty: "Intermediate", statement: "Copy one string to another using pointers.", "hint": "while(*src) { *dest = *src; src++; dest++; }", output: "Input: src='abc' -> Output: dest='abc'" },
    { id: 58, title: "Dynamic Array Realloc", category: "Pointers & Memory", difficulty: "Advanced", statement: "Allocate array of size N, then realloc to size 2N.", "hint": "arr = realloc(arr, 2*N*sizeof(int))", output: "Input: N=2 -> Output: Array doubled" },
    { id: 59, title: "Pointer to Pointer", category: "Pointers & Memory", difficulty: "Advanced", statement: "Modify a pointer's address using a pointer to a pointer.", "hint": "void change(int **p) { *p = new_addr; }", output: "Input: ptr -> Output: ptr points to new address" }
];

let existing = JSON.parse(fs.readFileSync('./problems.json', 'utf8'));
existing.push(...extraProblems);
fs.writeFileSync('./problems.json', JSON.stringify(existing, null, 2));
console.log('Appended extra problems.');
