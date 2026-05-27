import { gql } from '@apollo/client';

export const GET_RESTAURANTS = gql`
  query GetRestaurants {
    restaurants {
      id
      ownerId
      name
      description
      category
      imageUrl
      address
      phone
      isOpen
      rating
      createdAt
    }
  }
`;

export const GET_RESTAURANT = gql`
  query GetRestaurant($id: String!) {
    restaurant(id: $id) {
      id
      ownerId
      name
      description
      category
      imageUrl
      address
      phone
      isOpen
      rating
      createdAt
      categories {
        id
        restaurantId
        name
        menuItems {
          id
          restaurantId
          categoryId
          name
          description
          price
          imageUrl
          isAvailable
        }
      }
      menuItems {
        id
        restaurantId
        categoryId
        name
        description
        price
        imageUrl
        isAvailable
      }
    }
  }
`;

export const GET_ORDERS = gql`
  query GetOrders {
    orders {
      id
      customerId
      restaurantId
      status
      totalPrice
      notes
      address
      createdAt
      updatedAt
      items {
        id
        orderId
        menuItemId
        quantity
        unitPrice
        subtotal
        menuItem {
          id
          name
          description
          price
          imageUrl
        }
      }
      payment {
        id
        orderId
        amount
        status
        stripePaymentId
        paidAt
      }
      restaurant {
        id
        name
        category
        imageUrl
        address
      }
      customer {
        id
        email
        role
        profile {
          firstName
          lastName
          phone
          address
        }
      }
    }
  }
`;

export const GET_ORDER = gql`
  query GetOrder($id: String!) {
    order(id: $id) {
      id
      customerId
      restaurantId
      status
      totalPrice
      notes
      address
      createdAt
      updatedAt
      items {
        id
        orderId
        menuItemId
        quantity
        unitPrice
        subtotal
        menuItem {
          id
          name
          description
          price
          imageUrl
        }
      }
      payment {
        id
        orderId
        amount
        status
        stripePaymentId
        paidAt
      }
      auditLogs {
        id
        orderId
        eventType
        fromStatus
        toStatus
        triggeredBy
        createdAt
      }
      restaurant {
        id
        name
        category
        imageUrl
        address
        phone
      }
      customer {
        id
        email
        role
        profile {
          firstName
          lastName
          phone
          address
        }
      }
    }
  }
`;

export const GET_ORDER_AUDIT_LOG = gql`
  query GetOrderAuditLog($orderId: String!) {
    getOrderAuditLog(orderId: $orderId) {
      id
      orderId
      eventType
      fromStatus
      toStatus
      triggeredBy
      createdAt
    }
  }
`;
