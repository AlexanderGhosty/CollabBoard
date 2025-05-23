/**
 * Utility for batching promise executions to limit concurrency
 */

/**
 * Executes an array of promise-returning functions in batches to limit concurrency
 * 
 * @param tasks - Array of functions that return promises
 * @param batchSize - Maximum number of promises to execute concurrently
 * @returns Promise that resolves to an array of results in the same order as the input tasks
 */
export async function batchPromises<T>(
  tasks: (() => Promise<T>)[],
  batchSize: number = 3
): Promise<T[]> {
  // Store all results in order
  const results: T[] = new Array(tasks.length);
  
  // Process tasks in batches
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    
    // Create an array of promises with their index
    const batchPromises = batch.map((task, batchIndex) => {
      const taskIndex = i + batchIndex;
      return task().then(result => {
        // Store the result at the original task index
        results[taskIndex] = result;
        return result;
      });
    });
    
    // Wait for the current batch to complete before moving to the next
    await Promise.all(batchPromises);
  }
  
  return results;
}
