data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  az1 = var.availability_zone != null ? var.availability_zone : data.aws_availability_zones.available.names[0]
  az2 = length(data.aws_availability_zones.available.names) > 1 ? data.aws_availability_zones.available.names[1] : local.az1
}

# 1. Virtual Private Cloud (VPC)
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(
    var.tags,
    {
      Name = "smart-parking-vpc"
    }
  )
}

# 2. Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(
    var.tags,
    {
      Name = "smart-parking-igw"
    }
  )
}

# 3. Public Subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = local.az1
  map_public_ip_on_launch = true

  tags = merge(
    var.tags,
    {
      Name = "smart-parking-public-subnet"
      Tier = "Public"
    }
  )
}

# 4. Primary Private Subnet
resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidr
  availability_zone = local.az1

  tags = merge(
    var.tags,
    {
      Name = "smart-parking-private-subnet-1"
      Tier = "Private"
    }
  )
}

# 5. Secondary Private Subnet (Required for RDS Multi-AZ / DB Subnet Group)
resource "aws_subnet" "private_secondary" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, 3) # e.g. 10.0.3.0/24
  availability_zone = local.az2

  tags = merge(
    var.tags,
    {
      Name = "smart-parking-private-subnet-2"
      Tier = "Private"
    }
  )
}

# 6. Elastic IP for NAT Gateway
resource "aws_eip" "nat" {
  count  = var.enable_nat_gateway ? 1 : 0
  domain = "vpc"

  tags = merge(
    var.tags,
    {
      Name = "smart-parking-nat-eip"
    }
  )

  depends_on = [aws_internet_gateway.main]
}

# 7. NAT Gateway (in Public Subnet)
resource "aws_nat_gateway" "main" {
  count         = var.enable_nat_gateway ? 1 : 0
  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public.id

  tags = merge(
    var.tags,
    {
      Name = "smart-parking-nat-gw"
    }
  )

  depends_on = [aws_internet_gateway.main]
}

# 8. Public Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(
    var.tags,
    {
      Name = "smart-parking-public-rt"
    }
  )
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# 9. Private Route Table
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  dynamic "route" {
    for_each = var.enable_nat_gateway ? [1] : []
    content {
      cidr_block     = "0.0.0.0/0"
      nat_gateway_id = aws_nat_gateway.main[0].id
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "smart-parking-private-rt"
    }
  )
}

resource "aws_route_table_association" "private" {
  subnet_id      = aws_subnet.private.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_secondary" {
  subnet_id      = aws_subnet.private_secondary.id
  route_table_id = aws_route_table.private.id
}

