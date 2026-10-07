package com.cakeplatform.api.modules.user.service;

import com.cakeplatform.api.modules.user.CustomerAddress;
import com.cakeplatform.api.modules.user.CustomerAddressRepository;
import com.cakeplatform.api.modules.user.User;
import com.cakeplatform.api.modules.user.UserRepository;
import com.cakeplatform.api.modules.user.dto.CustomerAddressRequest;
import com.cakeplatform.api.modules.user.dto.CustomerAddressResponse;
import com.cakeplatform.api.modules.user.dto.CustomerProfileResponse;
import com.cakeplatform.api.modules.user.dto.CustomerProfileUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomerProfileService {

    private final UserRepository userRepository;
    private final CustomerAddressRepository addressRepository;

    @Transactional(readOnly = true)
    public CustomerProfileResponse getProfile(Long customerId) {
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new IllegalArgumentException("Customer not found"));
        return mapToProfileResponse(customer);
    }

    @Transactional
    public CustomerProfileResponse updateProfile(Long customerId, CustomerProfileUpdateRequest request) {
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            String email = request.getEmail().trim().toLowerCase();
            if (!email.equals(customer.getEmail())) {
                boolean emailExists = userRepository.existsByEmailIgnoreCase(email);
                if (emailExists) {
                    throw new IllegalArgumentException("Email is already in use");
                }
                customer.setEmail(email);
            }
        } else {
            customer.setEmail(null);
        }

        customer.setFullName(request.getFullName().trim());
        User updated = userRepository.save(customer);
        
        return mapToProfileResponse(updated);
    }

    @Transactional(readOnly = true)
    public List<CustomerAddressResponse> getAddresses(Long customerId) {
        return addressRepository.findByCustomerIdOrderByIsDefaultDescCreatedAtDesc(customerId)
                .stream()
                .map(this::mapToAddressResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public CustomerAddressResponse addAddress(Long customerId, CustomerAddressRequest request) {
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        if (request.isDefault()) {
            clearDefaultAddress(customerId);
        }

        List<CustomerAddress> existing = addressRepository.findByCustomerIdOrderByIsDefaultDescCreatedAtDesc(customerId);
        boolean isFirst = existing.isEmpty();

        CustomerAddress address = new CustomerAddress();
        address.setCustomer(customer);
        address.setLabel(request.getLabel());
        address.setRecipientName(request.getRecipientName());
        address.setRecipientPhone(request.getRecipientPhone());
        address.setDeliveryAddress(request.getDeliveryAddress());
        address.setDefault(isFirst || request.isDefault());

        return mapToAddressResponse(addressRepository.save(address));
    }

    @Transactional
    public CustomerAddressResponse updateAddress(Long customerId, Long addressId, CustomerAddressRequest request) {
        CustomerAddress address = addressRepository.findByIdAndCustomerId(addressId, customerId)
                .orElseThrow(() -> new IllegalArgumentException("Address not found or does not belong to customer"));

        if (request.isDefault() && !address.isDefault()) {
            clearDefaultAddress(customerId);
        }

        address.setLabel(request.getLabel());
        address.setRecipientName(request.getRecipientName());
        address.setRecipientPhone(request.getRecipientPhone());
        address.setDeliveryAddress(request.getDeliveryAddress());
        
        if (request.isDefault()) {
            address.setDefault(true);
        } // We don't unset default through normal update unless another is set as default

        return mapToAddressResponse(addressRepository.save(address));
    }

    @Transactional
    public void deleteAddress(Long customerId, Long addressId) {
        CustomerAddress address = addressRepository.findByIdAndCustomerId(addressId, customerId)
                .orElseThrow(() -> new IllegalArgumentException("Address not found or does not belong to customer"));
        
        boolean wasDefault = address.isDefault();
        addressRepository.delete(address);
        
        if (wasDefault) {
            List<CustomerAddress> remaining = addressRepository.findByCustomerIdOrderByIsDefaultDescCreatedAtDesc(customerId);
            if (!remaining.isEmpty()) {
                CustomerAddress newDefault = remaining.get(0);
                newDefault.setDefault(true);
                addressRepository.save(newDefault);
            }
        }
    }

    @Transactional
    public void setDefaultAddress(Long customerId, Long addressId) {
        CustomerAddress address = addressRepository.findByIdAndCustomerId(addressId, customerId)
                .orElseThrow(() -> new IllegalArgumentException("Address not found or does not belong to customer"));

        if (!address.isDefault()) {
            clearDefaultAddress(customerId);
            address.setDefault(true);
            addressRepository.save(address);
        }
    }

    private void clearDefaultAddress(Long customerId) {
        List<CustomerAddress> addresses = addressRepository.findByCustomerIdOrderByIsDefaultDescCreatedAtDesc(customerId);
        for (CustomerAddress addr : addresses) {
            if (addr.isDefault()) {
                addr.setDefault(false);
                addressRepository.save(addr);
            }
        }
    }

    private CustomerProfileResponse mapToProfileResponse(User user) {
        CustomerProfileResponse res = new CustomerProfileResponse();
        res.setId(user.getId());
        res.setFullName(user.getFullName());
        res.setEmail(user.getEmail());
        res.setMobile(user.getMobile());
        return res;
    }

    private CustomerAddressResponse mapToAddressResponse(CustomerAddress address) {
        CustomerAddressResponse res = new CustomerAddressResponse();
        res.setId(address.getId());
        res.setLabel(address.getLabel());
        res.setRecipientName(address.getRecipientName());
        res.setRecipientPhone(address.getRecipientPhone());
        res.setDeliveryAddress(address.getDeliveryAddress());
        res.setDefault(address.isDefault());
        return res;
    }
}
