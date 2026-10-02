package com.cakeplatform.api.modules.interaction.service;

import com.cakeplatform.api.modules.audit.ActivityLoggerService;
import com.cakeplatform.api.modules.interaction.*;
import com.cakeplatform.api.modules.interaction.dto.ConvertToOrderRequest;
import com.cakeplatform.api.modules.interaction.dto.ConvertToOrderResponse;
import com.cakeplatform.api.modules.interaction.dto.ReplyRequest;
import com.cakeplatform.api.modules.notification.EmailService;
import com.cakeplatform.api.modules.notification.SmsService;
import com.cakeplatform.api.modules.order.Order;
import com.cakeplatform.api.modules.order.OrderItem;
import com.cakeplatform.api.modules.order.OrderRepository;
import com.cakeplatform.api.modules.security.ShopAccessValidator;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopDeliverySlot;
import com.cakeplatform.api.modules.shop.ShopDeliverySlotRepository;
import com.cakeplatform.api.modules.user.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Slf4j
public class OwnerInteractionService {

    private final FeedbackRepository feedbackRepository;
    private final EnquiryRepository enquiryRepository;
    private final CustomCakeRequestRepository customCakeRequestRepository;
    private final ShopAccessValidator shopAccessValidator;
    private final EmailService emailService;
    private final SmsService smsService;
    private final OrderRepository orderRepository;
    private final ShopDeliverySlotRepository deliverySlotRepository;
    private final UserRepository userRepository;
    private final ActivityLoggerService activityLogger;

    @Autowired
    public OwnerInteractionService(
            FeedbackRepository feedbackRepository,
            EnquiryRepository enquiryRepository,
            CustomCakeRequestRepository customCakeRequestRepository,
            ShopAccessValidator shopAccessValidator,
            EmailService emailService,
            SmsService smsService,
            OrderRepository orderRepository,
            ShopDeliverySlotRepository deliverySlotRepository,
            UserRepository userRepository,
            ActivityLoggerService activityLogger) {
        this.feedbackRepository = feedbackRepository;
        this.enquiryRepository = enquiryRepository;
        this.customCakeRequestRepository = customCakeRequestRepository;
        this.shopAccessValidator = shopAccessValidator;
        this.emailService = emailService;
        this.smsService = smsService;
        this.orderRepository = orderRepository;
        this.deliverySlotRepository = deliverySlotRepository;
        this.userRepository = userRepository;
        this.activityLogger = activityLogger;
    }

    public OwnerInteractionService(
            FeedbackRepository feedbackRepository,
            EnquiryRepository enquiryRepository,
            CustomCakeRequestRepository customCakeRequestRepository,
            ShopAccessValidator shopAccessValidator,
            EmailService emailService) {
        this(feedbackRepository, enquiryRepository, customCakeRequestRepository, shopAccessValidator, emailService, null, null, null, null, null);
    }

    public OwnerInteractionService(
            FeedbackRepository feedbackRepository,
            EnquiryRepository enquiryRepository,
            CustomCakeRequestRepository customCakeRequestRepository,
            ShopAccessValidator shopAccessValidator) {
        this(feedbackRepository, enquiryRepository, customCakeRequestRepository, shopAccessValidator, null, null, null, null, null, null);
    }

    public List<Feedback> getMyFeedback(Long ownerId) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        return feedbackRepository.findByShopIdAndDeletedAtIsNullOrderByCreatedAtDesc(shop.getId());
    }

    @Transactional
    public Feedback replyToFeedback(Long ownerId, Long feedbackId, ReplyRequest request) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        Feedback feedback = feedbackRepository.findByIdAndShopId(feedbackId, shop.getId())
                .orElseThrow(() -> new RuntimeException("Feedback not found"));
        
        feedback.setOwnerReply(request.getReply());
        Feedback saved = feedbackRepository.save(feedback);

        // Dispatch Customer Notification
        try {
            if (emailService != null && saved.getCustomerEmail() != null && !saved.getCustomerEmail().isBlank()) {
                String subject = String.format("[%s] The baker replied to your review!", shop.getBusinessName());
                String body = String.format(
                        "Hello %s,\n\n" +
                        "%s has replied to your review!\n\n" +
                        "Your Rating: %d / 5 Stars\n" +
                        "Your Review:\n\"%s\"\n\n" +
                        "Bakery Response:\n\"%s\"\n\n" +
                        "Thank you for sharing your experience with %s!",
                        saved.getCustomerDisplayName() != null ? saved.getCustomerDisplayName() : "Valued Customer",
                        shop.getBusinessName(),
                        saved.getRating(),
                        saved.getComment() != null ? saved.getComment() : "",
                        request.getReply(),
                        shop.getBusinessName()
                );
                emailService.sendEmail(saved.getCustomerEmail(), subject, body);
            }
        } catch (Exception ex) {
            log.warn("Failed to dispatch customer email on feedback reply: {}", ex.getMessage());
        }

        return saved;
    }

    @Transactional
    public void deleteFeedback(Long ownerId, Long feedbackId, String deletedBy) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        Feedback feedback = feedbackRepository.findByIdAndShopId(feedbackId, shop.getId())
                .orElseThrow(() -> new RuntimeException("Feedback not found"));
        
        feedback.setDeletedAt(LocalDateTime.now());
        feedback.setDeletedBy(deletedBy);
        feedbackRepository.save(feedback);
    }

    @Transactional
    public Feedback toggleFeedbackApproval(Long ownerId, Long feedbackId, boolean isApproved) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        Feedback feedback = feedbackRepository.findByIdAndShopId(feedbackId, shop.getId())
                .orElseThrow(() -> new RuntimeException("Feedback not found"));
        
        feedback.setIsApproved(isApproved);
        return feedbackRepository.save(feedback);
    }

    public List<Enquiry> getMyEnquiries(Long ownerId) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        return enquiryRepository.findByShopIdOrderByCreatedAtDesc(shop.getId());
    }

    @Transactional
    public Enquiry replyToEnquiry(Long ownerId, Long enquiryId, ReplyRequest request) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        Enquiry enquiry = enquiryRepository.findByIdAndShopId(enquiryId, shop.getId())
                .orElseThrow(() -> new RuntimeException("Enquiry not found"));
        
        enquiry.setOwnerReply(request.getReply());
        enquiry.setStatus("REPLIED");
        Enquiry saved = enquiryRepository.save(enquiry);

        // Send transactional email notification to customer
        if (emailService != null && saved.getCustomerEmail() != null && !saved.getCustomerEmail().isBlank()) {
            try {
                String subject = String.format("Reply to your inquiry from %s", shop.getBusinessName());
                StringBuilder body = new StringBuilder();
                body.append("Dear ").append(saved.getCustomerName()).append(",\n\n");
                body.append("Thank you for reaching out to ").append(shop.getBusinessName()).append(" on CakeStore!\n\n");
                body.append("Your Inquiry:\n");
                body.append("\"").append(saved.getMessage()).append("\"\n\n");
                body.append("Reply from ").append(shop.getBusinessName()).append(":\n");
                body.append("\"").append(saved.getOwnerReply()).append("\"\n\n");
                body.append("If you have any further questions, feel free to reply or contact the bakery directly.\n\n");
                body.append("Warm regards,\n").append(shop.getBusinessName());
                emailService.sendEmail(saved.getCustomerEmail().trim(), subject, body.toString());
            } catch (Exception ex) {
                log.warn("Failed to dispatch enquiry reply email to {}: {}", saved.getCustomerEmail(), ex.getMessage());
            }
        }

        return saved;
    }

    @Transactional
    public void deleteEnquiry(Long ownerId, Long enquiryId) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        Enquiry enquiry = enquiryRepository.findByIdAndShopId(enquiryId, shop.getId())
                .orElseThrow(() -> new RuntimeException("Enquiry not found"));
        enquiryRepository.delete(enquiry);
    }

    @Transactional
    public Enquiry updateEnquiryStatus(Long ownerId, Long enquiryId, String status) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        Enquiry enquiry = enquiryRepository.findByIdAndShopId(enquiryId, shop.getId())
                .orElseThrow(() -> new RuntimeException("Enquiry not found"));
        enquiry.setStatus(status);
        return enquiryRepository.save(enquiry);
    }

    public List<CustomCakeRequest> getMyCustomCakeRequests(Long ownerId) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        return customCakeRequestRepository.findByShopIdOrderByCreatedAtDesc(shop.getId());
    }

    @Transactional
    public CustomCakeRequest updateCustomCakeRequestStatus(Long ownerId, Long requestId, String status, ReplyRequest request) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        CustomCakeRequest cakeReq = customCakeRequestRepository.findByIdAndShopId(requestId, shop.getId())
                .orElseThrow(() -> new RuntimeException("Custom cake request not found"));
        
        cakeReq.setStatus(status);
        if (request != null && request.getReply() != null) {
            cakeReq.setOwnerResponse(request.getReply());
        }
        CustomCakeRequest saved = customCakeRequestRepository.save(cakeReq);

        // Send transactional email notification to customer
        if (emailService != null && saved.getCustomerEmail() != null && !saved.getCustomerEmail().isBlank()) {
            try {
                String subject = String.format("Update on your Custom Cake Request #%d - %s", saved.getId(), shop.getBusinessName());
                StringBuilder body = new StringBuilder();
                body.append("Dear ").append(saved.getCustomerName()).append(",\n\n");
                body.append("Thank you for your custom celebration cake request with ").append(shop.getBusinessName()).append("!\n\n");
                body.append("Request Summary:\n");
                body.append("--------------------------------------------------\n");
                body.append("Request ID   : #").append(saved.getId()).append("\n");
                body.append("Occasion     : ").append(saved.getOccasion() != null ? saved.getOccasion() : "Custom Celebration Cake").append("\n");
                if (saved.getFlavour() != null) body.append("Flavour      : ").append(saved.getFlavour()).append("\n");
                if (saved.getServings() != null) body.append("Servings     : ").append(saved.getServings()).append(" servings\n");
                if (saved.getRequiredDate() != null) body.append("Event Date   : ").append(saved.getRequiredDate()).append("\n");
                body.append("Current Status: ").append(saved.getStatus()).append("\n");
                body.append("--------------------------------------------------\n\n");
                if (saved.getOwnerResponse() != null && !saved.getOwnerResponse().isBlank()) {
                    body.append("Message & Price Quote from Baker:\n");
                    body.append("\"").append(saved.getOwnerResponse()).append("\"\n\n");
                }
                body.append("To confirm your order or finalize cake details, please contact the bakery directly:\n");
                if (shop.getPhone() != null) {
                    body.append("Phone/WhatsApp: ").append(shop.getPhone()).append("\n");
                }
                body.append("Bakery: ").append(shop.getBusinessName()).append("\n\n");
                body.append("Warm regards,\nThe CakeStore Team & ").append(shop.getBusinessName());
                emailService.sendEmail(saved.getCustomerEmail().trim(), subject, body.toString());
            } catch (Exception ex) {
                log.warn("Failed to dispatch custom cake status email to {}: {}", saved.getCustomerEmail(), ex.getMessage());
            }
        }

        return saved;
    }

    @Transactional
    public ConvertToOrderResponse convertToOrder(Long ownerId, Long requestId, ConvertToOrderRequest request) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        CustomCakeRequest cakeReq = customCakeRequestRepository.findByIdAndShopId(requestId, shop.getId())
                .orElseThrow(() -> new RuntimeException("Custom cake request not found"));

        if (cakeReq.getConvertedOrderId() != null) {
            Optional<Order> existing = orderRepository.findById(cakeReq.getConvertedOrderId());
            if (existing.isPresent()) {
                throw new IllegalStateException("Request has already been converted to Order #" + existing.get().getOrderNumber());
            }
        }

        BigDecimal price = (request != null && request.getAgreedPrice() != null)
                ? request.getAgreedPrice()
                : (cakeReq.getBudget() != null ? cakeReq.getBudget() : BigDecimal.ZERO);
        if (price.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Agreed price cannot be negative");
        }

        BigDecimal deliveryCharge = (request != null && request.getDeliveryCharge() != null)
                ? request.getDeliveryCharge()
                : BigDecimal.ZERO;
        if (deliveryCharge.compareTo(BigDecimal.ZERO) < 0) {
            deliveryCharge = BigDecimal.ZERO;
        }

        BigDecimal totalAmount = price.add(deliveryCharge);

        String paymentMethod = (request != null && request.getPaymentMethod() != null && !request.getPaymentMethod().isBlank())
                ? request.getPaymentMethod().trim().toUpperCase()
                : "COD";

        String paymentStatus = (request != null && request.getPaymentStatus() != null && !request.getPaymentStatus().isBlank())
                ? request.getPaymentStatus().trim().toUpperCase()
                : ("PAID".equalsIgnoreCase(paymentMethod) || "ADVANCE_PAID".equalsIgnoreCase(paymentMethod) ? "PAID" : "PENDING");

        LocalDate deliveryDate = (request != null && request.getDeliveryDate() != null)
                ? request.getDeliveryDate()
                : cakeReq.getRequiredDate();

        String fulfillmentType = (request != null && request.getFulfillmentType() != null)
                ? request.getFulfillmentType().trim().toUpperCase()
                : "DOORSTEP_DELIVERY";

        String deliveryAddress;
        if (request != null && request.getDeliveryAddress() != null && !request.getDeliveryAddress().isBlank()) {
            deliveryAddress = request.getDeliveryAddress().trim();
        } else if ("STORE_PICKUP".equals(fulfillmentType) || "PICKUP".equals(fulfillmentType)) {
            deliveryAddress = "Store Pickup at " + shop.getBusinessName() + (shop.getAddress() != null ? " (" + shop.getAddress() + ")" : "");
        } else {
            deliveryAddress = cakeReq.getDeliveryPreference() != null && !cakeReq.getDeliveryPreference().isBlank()
                    ? cakeReq.getDeliveryPreference()
                    : "Customer Delivery";
        }

        ShopDeliverySlot slot = null;
        if (request != null && request.getDeliverySlotId() != null && deliverySlotRepository != null) {
            slot = deliverySlotRepository.findByIdAndShopId(request.getDeliverySlotId(), shop.getId()).orElse(null);
        }

        String orderNumber = "ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Order order = new Order();
        order.setShop(shop);
        order.setOrderNumber(orderNumber);
        order.setCustomerName(cakeReq.getCustomerName());
        order.setCustomerEmail(cakeReq.getCustomerEmail());
        order.setCustomerPhone(cakeReq.getCustomerMobile());
        order.setDeliveryAddress(deliveryAddress);
        order.setDeliveryDate(deliveryDate);
        order.setDeliverySlot(slot);
        order.setSubtotal(price);
        order.setDeliveryCharge(deliveryCharge);
        order.setDiscountAmount(BigDecimal.ZERO);
        order.setTotalAmount(totalAmount);
        order.setPaymentMethod(paymentMethod);
        order.setPaymentStatus(paymentStatus);
        order.setOrderStatus("CONFIRMED");

        if ("PAID".equalsIgnoreCase(paymentStatus)) {
            order.setPaidAt(LocalDateTime.now());
            order.setTransactionId("CUSTOM_CAKE_CONVERSION");
        }

        // Link registered customer user if exists
        if (userRepository != null && cakeReq.getCustomerEmail() != null && !cakeReq.getCustomerEmail().isBlank()) {
            userRepository.findByEmailIgnoreCase(cakeReq.getCustomerEmail().trim()).ifPresent(order::setCustomer);
        }

        // Create the bespoke OrderItem
        OrderItem item = new OrderItem();
        item.setOrder(order);
        item.setProduct(null); // Custom bespoke cake
        String cakeTitle = (cakeReq.getOccasion() != null && !cakeReq.getOccasion().isBlank())
                ? "Custom Cake: " + cakeReq.getOccasion().trim()
                : "Bespoke Custom Cake";
        item.setProductNameSnapshot(cakeTitle);
        item.setUnitPrice(price);
        item.setQuantity(1);
        item.setTotalPrice(price);
        item.setDietaryPreference(cakeReq.getCakeType());
        item.setCakeMessage(cakeReq.getDesignDescription());
        item.setPhotoReferenceUrl(cakeReq.getReferenceImageUrl());
        item.setProductImageUrl(cakeReq.getReferenceImageUrl());

        String variantDesc = "";
        if (cakeReq.getServings() != null) {
            variantDesc += cakeReq.getServings() + " Servings";
        }
        if (cakeReq.getFlavour() != null && !cakeReq.getFlavour().isBlank()) {
            variantDesc += (variantDesc.isEmpty() ? "" : " • ") + cakeReq.getFlavour().trim();
        }
        item.setVariantName(!variantDesc.isEmpty() ? variantDesc : "Bespoke Recipe");

        // Build comprehensive KOT specs
        StringBuilder kot = new StringBuilder();
        kot.append("Custom Cake Request #").append(cakeReq.getId()).append("\n");
        if (cakeReq.getOccasion() != null) kot.append("Occasion: ").append(cakeReq.getOccasion()).append("\n");
        if (cakeReq.getFlavour() != null) kot.append("Flavour: ").append(cakeReq.getFlavour()).append("\n");
        if (cakeReq.getServings() != null) kot.append("Servings: ").append(cakeReq.getServings()).append("\n");
        if (cakeReq.getRequiredDate() != null) kot.append("Event Date: ").append(cakeReq.getRequiredDate()).append("\n");
        if (cakeReq.getDeliveryPreference() != null) kot.append("Fulfillment: ").append(cakeReq.getDeliveryPreference()).append("\n");

        if (cakeReq.getFieldValues() != null && !cakeReq.getFieldValues().isEmpty()) {
            kot.append("Custom Specifications:\n");
            for (CustomCakeRequestFieldValue fv : cakeReq.getFieldValues()) {
                String label = fv.getFieldLabel() != null ? fv.getFieldLabel() : fv.getFieldKey();
                kot.append("• ").append(label).append(": ").append(fv.getFieldValue() != null ? fv.getFieldValue() : "").append("\n");
            }
        }

        if (request != null && request.getNotes() != null && !request.getNotes().isBlank()) {
            kot.append("Baker Notes: ").append(request.getNotes().trim()).append("\n");
        }
        item.setAddonsSummary(kot.toString().trim());

        order.getItems().add(item);

        Order savedOrder = orderRepository.save(order);

        // Update the CustomCakeRequest
        cakeReq.setStatus("ACCEPTED");
        cakeReq.setConvertedOrderId(savedOrder.getId());
        cakeReq.setConvertedOrderNumber(savedOrder.getOrderNumber());
        if (request != null && request.getNotes() != null && !request.getNotes().isBlank()) {
            cakeReq.setOwnerResponse("Converted to Order #" + savedOrder.getOrderNumber() + ". Note: " + request.getNotes().trim());
        } else if (cakeReq.getOwnerResponse() == null || cakeReq.getOwnerResponse().isBlank()) {
            cakeReq.setOwnerResponse("Converted to official Order #" + savedOrder.getOrderNumber());
        }
        customCakeRequestRepository.save(cakeReq);

        // Activity Log
        if (activityLogger != null) {
            try {
                activityLogger.logActivity(
                        ownerId,
                        shop.getId(),
                        "CUSTOM_CAKE_CONVERTED_TO_ORDER",
                        "ORDER",
                        savedOrder.getId(),
                        String.format("Converted custom cake request #%d into Order #%s (₹%s)",
                                cakeReq.getId(), savedOrder.getOrderNumber(), savedOrder.getTotalAmount())
                );
            } catch (Exception ex) {
                log.warn("Failed to log activity for order conversion: {}", ex.getMessage());
            }
        }

        // Email Customer
        if (emailService != null && savedOrder.getCustomerEmail() != null && !savedOrder.getCustomerEmail().isBlank()) {
            try {
                String subject = String.format("🎉 Order Confirmed! Custom Cake #%s - %s", savedOrder.getOrderNumber(), shop.getBusinessName());
                String body = String.format(
                        "Dear %s,\n\n" +
                        "Great news! Your custom cake request has been officially accepted and confirmed as an order by %s!\n\n" +
                        "Order Details:\n" +
                        "--------------------------------------------------\n" +
                        "Order Number : #%s\n" +
                        "Item         : %s\n" +
                        "Event Date   : %s\n" +
                        "Total Amount : ₹%s\n" +
                        "Payment Mode : %s (%s)\n" +
                        "Status       : CONFIRMED\n" +
                        "--------------------------------------------------\n\n" +
                        "Our bakery kitchen is preparing your custom creation.\n" +
                        "For any queries, please call or WhatsApp us at: %s\n\n" +
                        "Warm regards,\nThe %s Team",
                        savedOrder.getCustomerName() != null ? savedOrder.getCustomerName() : "Customer",
                        shop.getBusinessName(),
                        savedOrder.getOrderNumber(),
                        item.getProductNameSnapshot(),
                        savedOrder.getDeliveryDate() != null ? savedOrder.getDeliveryDate().toString() : "As agreed",
                        savedOrder.getTotalAmount(),
                        savedOrder.getPaymentMethod(),
                        savedOrder.getPaymentStatus(),
                        shop.getPhone() != null ? shop.getPhone() : "our bakery",
                        shop.getBusinessName()
                );
                emailService.sendEmail(savedOrder.getCustomerEmail().trim(), subject, body);
            } catch (Exception ex) {
                log.warn("Failed to dispatch conversion email: {}", ex.getMessage());
            }
        }

        // SMS Customer
        if (smsService != null && savedOrder.getCustomerPhone() != null && !savedOrder.getCustomerPhone().isBlank()) {
            try {
                smsService.sendSms(
                        savedOrder.getCustomerPhone(),
                        String.format("Hi %s! Your custom cake with %s is confirmed as Order #%s. Total: ₹%s. 🎂",
                                savedOrder.getCustomerName(), shop.getBusinessName(), savedOrder.getOrderNumber(), savedOrder.getTotalAmount())
                );
            } catch (Exception ex) {
                log.warn("Failed to dispatch conversion SMS: {}", ex.getMessage());
            }
        }

        return ConvertToOrderResponse.builder()
                .orderId(savedOrder.getId())
                .orderNumber(savedOrder.getOrderNumber())
                .customCakeRequestId(cakeReq.getId())
                .totalAmount(savedOrder.getTotalAmount())
                .orderStatus(savedOrder.getOrderStatus())
                .paymentStatus(savedOrder.getPaymentStatus())
                .message("Successfully converted to Order #" + savedOrder.getOrderNumber())
                .build();
    }
}

