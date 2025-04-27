/**
 * ES6 Class for managing hackathon data and operations in the frontend
 * This satisfies the requirement for ES6 classes in the project
 */
class HackathonManager {
    /**
     * Initialize the HackathonManager
     * @param {Object} options - Configuration options
     * @param {string} options.apiEndpoint - API endpoint for hackathon data
     * @param {Function} options.renderCallback - Function to call with rendered hackathons
     * @param {string} options.containerId - ID of the container element to render hackathons
     */
    constructor(options = {}) {
      this.apiEndpoint = options.apiEndpoint || '/api/hackathons/browse';
      this.renderCallback = options.renderCallback || (() => {});
      this.containerId = options.containerId || 'hackathons-container';
      this.hackathons = [];
      this.filteredHackathons = [];
      this.filters = {
        industry: '',
        status: '',
        search: ''
      };
    }
  
    /**
     * Load hackathons from the API
     * @returns {Promise<Array>} - Array of hackathon objects
     */
    async loadHackathons() {
      try {
        const response = await fetch(this.apiEndpoint);
        const data = await response.json();
        
        if (data.hackathons && Array.isArray(data.hackathons)) {
          this.hackathons = data.hackathons;
          this.filteredHackathons = [...this.hackathons];
          return this.hackathons;
        } else {
          throw new Error('Invalid hackathon data format');
        }
      } catch (error) {
        console.error('Error loading hackathons:', error);
        throw error;
      }
    }
  
    /**
     * Get a specific hackathon by ID
     * @param {string} id - Hackathon ID
     * @returns {Promise<Object>} - Hackathon object
     */
    async getHackathonById(id) {
      try {
        const response = await fetch(`/api/hackathons/${id}`);
        const data = await response.json();
        
        if (data.hackathon) {
          return data.hackathon;
        } else {
          throw new Error('Hackathon not found');
        }
      } catch (error) {
        console.error(`Error fetching hackathon ${id}:`, error);
        throw error;
      }
    }
  
    /**
     * Apply filters to the hackathons
     * @param {Object} filters - Filter criteria
     * @returns {Array} - Filtered hackathons
     */
    applyFilters(filters = {}) {
      // Update filters with any new values
      this.filters = { ...this.filters, ...filters };
      
      // Start with all hackathons
      let filtered = [...this.hackathons];
      
      // Apply industry filter if set
      if (this.filters.industry) {
        filtered = filtered.filter(h => h.industry === this.filters.industry);
      }
      
      // Apply status filter if set
      if (this.filters.status) {
        const now = new Date();
        filtered = filtered.filter(h => {
          const startDate = new Date(h.startDate);
          const endDate = new Date(h.endDate);
          
          if (this.filters.status === 'upcoming') return now < startDate;
          if (this.filters.status === 'active') return now >= startDate && now <= endDate;
          if (this.filters.status === 'completed') return now > endDate;
          return true;
        });
      }
      
      // Apply search filter if set
      if (this.filters.search) {
        const searchTerm = this.filters.search.toLowerCase();
        filtered = filtered.filter(h => 
          h.title.toLowerCase().includes(searchTerm) || 
          h.description.toLowerCase().includes(searchTerm) ||
          h.roleDescription.toLowerCase().includes(searchTerm)
        );
      }
      
      this.filteredHackathons = filtered;
      return this.filteredHackathons;
    }
  
    /**
     * Render hackathons to the container
     * @returns {void}
     */
    render() {
      const container = document.getElementById(this.containerId);
      if (!container) return;
      
      // Call the render callback with the filtered hackathons
      this.renderCallback(this.filteredHackathons, container);
    }
  
    /**
     * Sort hackathons by various criteria
     * @param {string} sortBy - Field to sort by
     * @param {boolean} ascending - Sort direction
     * @returns {Array} - Sorted hackathons
     */
    sortHackathons(sortBy = 'startDate', ascending = true) {
      const sortFunctions = {
        startDate: (a, b) => new Date(a.startDate) - new Date(b.startDate),
        endDate: (a, b) => new Date(a.endDate) - new Date(b.endDate),
        title: (a, b) => a.title.localeCompare(b.title)
      };
      
      const sortFn = sortFunctions[sortBy] || sortFunctions.startDate;
      
      this.filteredHackathons.sort((a, b) => {
        return ascending ? sortFn(a, b) : sortFn(b, a);
      });
      
      return this.filteredHackathons;
    }
    
    /**
     * Calculate days remaining until a hackathon ends
     * @param {string} endDateStr - End date as string
     * @returns {number} - Days remaining (negative if ended)
     */
    static getDaysRemaining(endDateStr) {
      const today = new Date();
      const endDate = new Date(endDateStr);
      const diffTime = endDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    
    /**
     * Format a date for display
     * @param {string} dateStr - Date as string
     * @returns {string} - Formatted date string
     */
    static formatDate(dateStr) {
      return new Date(dateStr).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    }
    
    /**
     * Get the hackathon status
     * @param {Object} hackathon - Hackathon object
     * @returns {string} - Status (upcoming, active, or completed)
     */
    static getStatus(hackathon) {
      const now = new Date();
      const startDate = new Date(hackathon.startDate);
      const endDate = new Date(hackathon.endDate);
      
      if (now < startDate) return 'upcoming';
      if (now <= endDate) return 'active';
      return 'completed';
    }
  }
  
  // Example usage:
  /*
  document.addEventListener('DOMContentLoaded', async () => {
    const renderHackathons = (hackathons, container) => {
      container.innerHTML = '';
      hackathons.forEach(hackathon => {
        const card = document.createElement('div');
        card.className = 'bg-white shadow rounded-lg p-4 mb-4';
        card.innerHTML = `
          <h3 class="text-lg font-bold">${hackathon.title}</h3>
          <p>${hackathon.description.substring(0, 100)}...</p>
          <div class="mt-2">
            <span class="text-sm text-gray-600">
              ${HackathonManager.formatDate(hackathon.startDate)} - 
              ${HackathonManager.formatDate(hackathon.endDate)}
            </span>
          </div>
        `;
        container.appendChild(card);
      });
    };
  
    const hackathonManager = new HackathonManager({
      renderCallback: renderHackathons
    });
  
    try {
      await hackathonManager.loadHackathons();
      hackathonManager.render();
      
      // Example: Filter to only show active hackathons
      document.getElementById('filter-active').addEventListener('click', () => {
        hackathonManager.applyFilters({ status: 'active' });
        hackathonManager.render();
      });
    } catch (error) {
      console.error('Error initializing hackathon manager:', error);
    }
  });
  */